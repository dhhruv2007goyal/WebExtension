from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
import numpy as np
import base64
from PIL import Image
import io
from keras.applications.mobilenet_v2 import preprocess_input

app = Flask(__name__)
CORS(app)

model = tf.keras.models.load_model('C:/Users/DELL/Documents/WebExt/best_model.keras')
class_names = ['no gesture', 'scroll down', 'scroll left', 
               'scroll right', 'scroll up', 'tab left', 
               'tab right', 'zoom in', 'zoom out']

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    base64_image = data['image']
    img_bytes = base64.b64decode(base64_image)
    img = Image.open(io.BytesIO(img_bytes)).convert('RGB')
    img = img.resize((224, 224))
    img_array = np.array(img, dtype=np.float32)
    img_array = np.expand_dims(img_array, axis=0)
    img_array = preprocess_input(img_array)
    predictions = model.predict(img_array, verbose=0)
    predicted_index = np.argmax(predictions)
    predicted_class = class_names[predicted_index]
    confidence = float(np.max(predictions)) * 100

    return jsonify({
        'gesture': predicted_class,
        'confidence': round(confidence, 2)
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)