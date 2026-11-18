from typing import Dict, Any, Tuple
from backend.config import settings


class ViralScoringEngine:
    """
    Configurable 5-pillar viral scoring engine.
    Weights:
      Hook strength: 25%
      Emotional intensity: 25%
      Entertainment value: 20%
      Context & payoff: 20%
      Editing potential: 10%
    """

    def __init__(
        self,
        weight_hook: float = settings.WEIGHT_HOOK,
        weight_emotion: float = settings.WEIGHT_EMOTION,
        weight_entertainment: float = settings.WEIGHT_ENTERTAINMENT,
        weight_context: float = settings.WEIGHT_CONTEXT,
        weight_editing: float = settings.WEIGHT_EDITING,
    ):
        self.weights = {
            "hook": weight_hook,
            "emotion": weight_emotion,
            "entertainment": weight_entertainment,
            "context": weight_context,
            "editing_potential": weight_editing,
        }
        self._normalize_weights()

    def _normalize_weights(self):
        total = sum(self.weights.values())
        if total > 0:
            for k in self.weights:
                self.weights[k] = round(self.weights[k] / total, 4)

    def update_weights(self, new_weights: Dict[str, float]):
        """Update configurable weights dynamically."""
        for k, v in new_weights.items():
            if k in self.weights:
                self.weights[k] = max(0.0, float(v))
        self._normalize_weights()

    def calculate_score(self, scores: Dict[str, float]) -> Tuple[float, str]:
        """
        Compute weighted overall score (0-100) and classification tier:
          - 90–100: Priority review
          - 75–89: Strong candidate
          - 60–74: Possible candidate
          - Below 60: Low priority
        """
        hook = scores.get("hook", 50.0)
        emotion = scores.get("emotion", 50.0)
        entertainment = scores.get("entertainment", 50.0)
        context = scores.get("context", 50.0)
        editing = scores.get("editing_potential", 50.0)

        overall = (
            hook * self.weights["hook"] +
            emotion * self.weights["emotion"] +
            entertainment * self.weights["entertainment"] +
            context * self.weights["context"] +
            editing * self.weights["editing_potential"]
        )
        overall = round(max(0.0, min(100.0, overall)), 1)

        # Classification
        if overall >= settings.SCORE_TIER_PRIORITY:
            tier = "priority"
        elif overall >= settings.SCORE_TIER_STRONG:
            tier = "strong"
        elif overall >= settings.SCORE_TIER_POSSIBLE:
            tier = "possible"
        else:
            tier = "low"

        return overall, tier
