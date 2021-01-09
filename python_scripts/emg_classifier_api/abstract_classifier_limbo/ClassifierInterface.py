import numpy as np
from abc import ABC, abstractmethod


class Classifier_Interface(ABC):
    def __init__(self, model_path) -> None:
        super().__init__()
        self.model = None
        self.load_model(model_path)

    @abstractmethod
    def classify(self, features: np.ndarray, fake: bool = False) -> dict:
        ...

    @abstractmethod
    def train(self, features: np.ndarray, label: str, fake: bool = False) -> bool:
        # OneHot implementation, example: `label: [0 0 0 0 1 0]`
        ...

    def load_model(self, file_route: str) -> None:
        self.model = None  # load_from_file() here

    def save_model(self, destination_path: str) -> None:
        # torch.save(self.model.state_dict(), destination_path)
        ...
