GESTURES = ['idle', 'fist', 'flexion', 'extension', 'pinch thumb-index',
            'pinch thumb-middle', 'pinch thumb-ring', 'pinch thumb-small']  # All possible gestures
BASE64_BYTES_PER_SAMPLE = 4
SCALE_FACTOR_EMG = 4500000 / 24 / (2 ** 23 - 1)  # uV/count
EMG_FREQUENCY = 1000  # Hz