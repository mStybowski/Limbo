# This is a sample Python script.

# Press Shift+F10 to execute it or replace it with your code.
# Press Double Shift to search everywhere for classes, files, tool windows, actions, and settings.

import numpy as np

from typing import Dict

from emglimbo import constants


class EMGClassifier:
    """
    Server API for EMG classifier.
    """

    def __init__(self):
        pass

    def classify(self, input_data: np.ndarray) -> Dict[str, float]:
        """
        Make a prediction based on input data.

        :param input_data: an array with data, shape = (WL, CH); where WL - window length, CH - number of EMG channels
        :type input_data: np.ndarray
        :return: probability distribution of gestures
        :rtype: dict
        """

        if input_data.size == 0:
            raise Exception("Input data is empty, cannot make a prediction!")
            return ""
        else:
            # Make a fake prediction
            prob_dist = {}
            for g in constants.GESTURES:
                prob_dist[g] = np.random.rand()
            return prob_dist

    def fine_tune(self, input_data: np.ndarray, gesture: str) -> bool:
        """
        Fine tune based on labeled input data.

        :param input_data: a list of JSONs (strings), in each of them there's a bunch of packets
        :type input_data: list
        :param gesture: a label for input data
        :type gesture: string
        :return: success
        :rtype: bool
        """

        if input_data.size == 0:
            print("Input list is empty, cannot make a prediction!")
            return False
        else:
            # Here will be fine tuning
            print(f'Model fine tuned with "{gesture}" gesture data!')
            return True

