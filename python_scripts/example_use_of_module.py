import emglimbo
from emglimbo.constants import GESTURES
from emglimbo.utils import json_2_array_of_data

if __name__ == '__main__':
    # Load example data from file
    with open('emglimbo/unittests_data/example_incoming_json.txt') as f:
        data_json = f.readline()
        
    # Decode data
    data = json_2_array_of_data(data_json)

    # Create an instance of the EMGClassifier class
    classifier = emglimbo.EMGClassifier()

    # Fine tune a model
    label = GESTURES[0]  # a gesture that user is making
    success = classifier.fine_tune(data, label)
    print("Fine tuning success: ", success)

    # Make a prediction
    pred = classifier.classify(data)
    print("Predicted gesture: ", pred)
