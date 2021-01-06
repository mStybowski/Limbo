# This is a sample Python script.

# Press Shift+F10 to execute it or replace it with your code.
# Press Double Shift to search everywhere for classes, files, tool windows, actions, and settings.

import numpy as np

from emglimbo import constants
from abstract_classifier_limbo import Classifier_Interface


class EMGClassifier(Classifier_Interface):
    """
    Server API for EMG classifier.
    """

    def __init__(self, model_path):
        super().__init__(model_path)

    def classify(self, features: np.ndarray, fake: bool = False) -> dict:
        """
        Make a prediction based on input data.

        :param features: flattened array (1D) with data to convert to 2D with
         shape = (WL, CH); where WL - window length, CH - number of EMG channels
        :type features: np.ndarray
        :param fake: return fake prediction (random values) without using actual model  (for API testing)
        :type fake: bool
        :return: probability distribution of gestures
        :rtype: dict
        """

        if fake:
            if features.size == 0:
                raise Exception("Input data is empty, cannot make a prediction!")
                return ""
            else:
                # Make a fake prediction
                prob_dist = {}
                for g in constants.GESTURES:
                    prob_dist[g] = np.random.rand()
                return prob_dist

    def train(self, features: np.ndarray, label: str, fake: bool = False) -> bool:
        """
        Fine tune based on labeled input data.

        :param features: flattened array (1D) with data to convert to 2D with
         shape = (WL, CH); where WL - window length, CH - number of EMG channels
        :type features: np.ndarray
        :param label: a label for input data
        :type label: str
        :param fake: return fake success (for API testing)
        :type fake: bool
        :return: success
        :rtype: bool
        """

        if fake:
            return True


if __name__ == "__main__":
    classifier = EMGClassifier("path")
    classifier.classify(np.zeros(3), fake=True)
    classifier.train(np.zeros(3), "idle", fake=True)
