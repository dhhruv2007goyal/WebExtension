import tensorflow as tf

DATASET_DIR = 'C:/Users/DELL/Documents/WebExt/dataset/'
IMG_SIZE = (224, 224)
BATCH_SIZE = 32
SEED = 42

train_ds = tf.keras.utils.image_dataset_from_directory(
    DATASET_DIR,
    validation_split=0.2,
    subset='training',
    seed=SEED,
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE
)

val_ds = tf.keras.utils.image_dataset_from_directory(
    DATASET_DIR,
    validation_split=0.2,
    subset='validation',
    seed=SEED,
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE
)

class_names = train_ds.class_names
print("Classes:", class_names)
print("Number of classes:", len(class_names))

AUTOTUNE = tf.data.AUTOTUNE

normalization = tf.keras.layers.Rescaling(1./255)

def preprocess_train(images, labels):
    images = tf.keras.applications.mobilenet_v2.preprocess_input(images)
    return images, labels

def preprocess_val(images, labels):
    images = tf.keras.applications.mobilenet_v2.preprocess_input(images)
    return images, labels

train_ds = train_ds.map(preprocess_train, num_parallel_calls=AUTOTUNE)
train_ds = train_ds.cache().shuffle(1000).prefetch(AUTOTUNE)

val_ds = val_ds.map(preprocess_val, num_parallel_calls=AUTOTUNE)
val_ds = val_ds.cache().prefetch(AUTOTUNE)

num_classes = len(class_names)

base_model = tf.keras.applications.MobileNetV2(
    input_shape=(224, 224, 3),
    include_top=False,
    weights='imagenet'
)
base_model.trainable = False  

model = tf.keras.Sequential([
    base_model,
    tf.keras.layers.GlobalAveragePooling2D(),
    tf.keras.layers.Dropout(0.3),
    tf.keras.layers.Dense(128, activation='relu'),
    tf.keras.layers.Dense(num_classes, activation='softmax')
])

model.compile(
    optimizer='adam',
    loss='sparse_categorical_crossentropy',
    metrics=['accuracy']
)

cp = tf.keras.callbacks.ModelCheckpoint(
    'C:/Users/DELL/Documents/WebExt/best_model.keras',
    monitor='val_accuracy',
    save_best_only=True,
    verbose=1
)

history = model.fit(
    train_ds,
    validation_data=val_ds,
    epochs=50,
    callbacks=[cp]
)

test_loss, test_accuracy = model.evaluate(val_ds)
print(f"Validation Loss:     {test_loss:.4f}")
print(f"Validation Accuracy: {test_accuracy:.4f}")