import tensorflow as tf
from keras.models import Sequential
from keras.applications import MobileNetV2
from keras.layers import Dense, GlobalAveragePooling2D
from keras.models import Model

IMG_SIZE = 128
BATCH_SIZE = 64

# 1. Load Data using image_dataset_from_directory instead of ImageDataGenerator
train_ds = tf.keras.utils.image_dataset_from_directory(
    "dataset/train",  # local path instead of Google Drive
    image_size=(IMG_SIZE, IMG_SIZE),
    batch_size=BATCH_SIZE
)

val_ds = tf.keras.utils.image_dataset_from_directory(
    "dataset/val",
    image_size=(IMG_SIZE, IMG_SIZE),
    batch_size=BATCH_SIZE
)

# Save class names before mapping
class_names = train_ds.class_names
num_classes = len(class_names)
print("Classes:", class_names)

# Normalize to match original rescale=1./255
AUTOTUNE = tf.data.AUTOTUNE
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

model = Model(inputs=base_model.input, outputs=output)

model.compile(
    optimizer="adam",
    loss="sparse_categorical_crossentropy",  # changed because image_dataset_from_directory returns integers not one-hot
    metrics=["accuracy"]
)

from keras.callbacks import EarlyStopping
es = EarlyStopping(monitor='val_loss', patience=3, restore_best_weights=True)

model.fit(train_ds, validation_data=val_ds, epochs=30, callbacks=[es])
model.save("hand_gesture_model.keras")  # save as .keras format
print("Classes order:", class_names)  # print so you know the order for clses in recog.py