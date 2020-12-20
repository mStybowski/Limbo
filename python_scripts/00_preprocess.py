from emglimbo.utils import json_2_array_of_data

import sys
import json

try:
    for line in sys.stdin:
        clean_line = ''.join(line.split())  # remove all white characters
        data_array = json_2_array_of_data(clean_line)
        features_dict = {'time series': data_array.tolist()}
        features_json = json.dumps(features_dict)
        sys.stdout.write(features_json)
except KeyboardInterrupt:
    pass
