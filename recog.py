from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
import numpy as np
import base64
from PIL import Image
import io
from keras.applications.mobilenet_v2 import preprocess_input
import os
import shutil
import base64
import threading

app = Flask(__name__)
CORS(app)

model = tf.keras.models.load_model('C:/Users/DELL/Documents/WebExt/hand_gesture_model.keras')
clses = ['down','fist','left','palm','right','up']
disabled = []

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    base64_image = data['image']
    img_bytes = base64.b64decode(base64_image)
    img = Image.open(io.BytesIO(img_bytes)).convert('RGB')
    img = img.resize((128, 128))
    img_array = np.array(img, dtype=np.float32)
    img_array = np.expand_dims(img_array, axis=0)
    img_array = preprocess_input(img_array)
    p = model.predict(img_array, verbose=0)
    ind = np.argmax(p)
    predicted_cls = clses[ind]
    confidence = float(np.max(p)) * 100
    if predicted_cls in disabled:
        return jsonify({'gesture': 'no gesture', 'confidence': 0})

    return jsonify({
        'gesture': predicted_cls,
        'confidence': round(confidence, 2)
    })

@app.route('/disable', methods=['POST'])
def disable():
    data = request.get_json()
    cls = data['class_name']
    
    if cls not in disabled:
        disabled.append(cls)
        return jsonify({'message': f'"{cls}" disabled successfully'})
    else:
        return jsonify({'message': f'"{cls}" was already disabled'})

@app.route('/enable', methods=['POST'])
def enable():
    data = request.get_json()
    cls = data['class_name']
    
    if cls in disabled:
        disabled.remove(cls)
        return jsonify({'message': f'"{cls}" enabled successfully'})
    else:
        return jsonify({'message': f'"{cls}" was not disabled'})

@app.route('/recapture', methods=['POST'])
def recapture():
    data = request.get_json()
    class_name = data['class_name']
    frames = data['frames']

    # Delete old class data from all splits
    for split in ['train', 'val', 'test']:
        class_path = os.path.join('dataset', split, class_name)
        if os.path.exists(class_path):
            shutil.rmtree(class_path)
            print(f"Deleted old data from {split}/{class_name}")
        os.makedirs(class_path)

    # Split frames 70% train, 20% val, 10% test
    total = len(frames)
    train_end = int(total * 0.7)
    val_end = int(total * 0.9)

    splits = {
        'train': frames[:train_end],
        'val': frames[train_end:val_end],
        'test': frames[val_end:]
    }

    for split, split_frames in splits.items():
        for i, frame_b64 in enumerate(split_frames):
            img_bytes = base64.b64decode(frame_b64)
            img = Image.open(io.BytesIO(img_bytes)).convert('RGB')
            img.save(os.path.join('dataset', split, class_name, f'frame_{i:04d}.jpg'))

    print(f"Saved {len(frames)} frames across train/val/test for: {class_name}")

    thread = threading.Thread(target=retrain_model)
    thread.start()

    return jsonify({'message': f'Captured {len(frames)} frames for "{class_name}". Retraining started...'})
retraining=False

def retrain_model():
    global retraining, model, clses
    retraining = True

    import tensorflow as tf
    from keras.applications import MobileNetV2
    from keras.layers import Dense, GlobalAveragePooling2D
    from keras.models import Model
    from keras.callbacks import EarlyStopping

    IMG_SIZE = (128, 128)
    BATCH_SIZE = 64
    AUTOTUNE = tf.data.AUTOTUNE

    train_ds = tf.keras.utils.image_dataset_from_directory(
        'dataset/train',
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE
    )

    val_ds = tf.keras.utils.image_dataset_from_directory(
        'dataset/val',
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE
    )

    # Save class names BEFORE mapping
    class_names_local = train_ds.class_names
    num_classes = len(class_names_local)
    print("Classes:", class_names_local)

    normalization = tf.keras.layers.Rescaling(1./255)
    train_ds = train_ds.map(lambda x, y: (normalization(x), y)).cache().shuffle(1000).prefetch(AUTOTUNE)
    val_ds = val_ds.map(lambda x, y: (normalization(x), y)).cache().prefetch(AUTOTUNE)

    base_model = MobileNetV2(
        weights="imagenet",
        include_top=False,
        input_shape=(128, 128, 3)
    )
    base_model.trainable = False

    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    output = Dense(num_classes, activation="softmax")(x)

    new_model = Model(inputs=base_model.input, outputs=output)
    new_model.compile(
        optimizer="adam",
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"]
    )

    es = EarlyStopping(monitor='val_loss', patience=3, restore_best_weights=True)
    new_model.fit(train_ds, validation_data=val_ds, epochs=10, callbacks=[es])
    new_model.save("hand_gesture_model.keras")

    clses = class_names_local

    model = tf.keras.models.load_model('hand_gesture_model.keras')
    retraining = False
    print("Retraining complete!")

@app.route('/status', methods=['GET'])
def status():
    return jsonify({'retraining': retraining})

if __name__ == '__main__':
    app.run(debug=True, port=5000)

