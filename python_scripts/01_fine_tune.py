import emglimbo

import sys
import json
import numpy as np

classifier = emglimbo.EMGClassifier()

try:
    for line in sys.stdin:
        clean_line = ''.join(line.split())  # remove all white characters
        input_json = json.loads(clean_line)
        time_series_chunks = []
        for chunk in input_json['features']:
            time_series_chunks.append(chunk['timeseries'])
        train_data = np.concatenate(time_series_chunks)
        gesture = input_json['gesture']
        success = classifier.fine_tune(train_data, gesture)
        if success:
            print("Successful fine tuning :)")

except KeyboardInterrupt:
    pass
