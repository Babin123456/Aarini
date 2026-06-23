import unittest

from cycle_prediction import normalize_cycles, predict_cycle


class CyclePredictionTests(unittest.TestCase):
    def test_regular_cycle_predicts_expected_dates_and_phase(self):
        cycles = [
            {"startDate": "2026-03-01", "endDate": "2026-03-05"},
            {"startDate": "2026-03-29", "endDate": "2026-04-02"},
            {"startDate": "2026-04-26", "endDate": "2026-04-30"},
        ]
        result = predict_cycle(cycles, today="2026-05-10")
        self.assertEqual(result["averageCycleLength"], 28)
        self.assertEqual(result["nextPeriodStart"], "2026-05-24")
        self.assertEqual(result["ovulationDate"], "2026-05-09")
        self.assertEqual(result["currentPhase"], "Ovulation")

    def test_recent_cycles_are_weighted_more_heavily(self):
        cycles = [
            {"startDate": "2026-01-01", "endDate": "2026-01-05"},
            {"startDate": "2026-01-27", "endDate": "2026-01-31"},
            {"startDate": "2026-02-24", "endDate": "2026-02-28"},
            {"startDate": "2026-03-26", "endDate": "2026-03-30"},
            {"startDate": "2026-04-27", "endDate": "2026-05-01"},
        ]
        result = predict_cycle(cycles, today="2026-05-10")
        self.assertEqual(result["averageCycleLength"], 30)
        self.assertEqual(result["nextPeriodStart"], "2026-05-27")

    def test_short_and_long_valid_cycles_are_supported(self):
        short = [
            {"startDate": "2026-01-01", "endDate": "2026-01-03"},
            {"startDate": "2026-01-22", "endDate": "2026-01-24"},
            {"startDate": "2026-02-12", "endDate": "2026-02-14"},
        ]
        long = [
            {"startDate": "2026-01-01", "endDate": "2026-01-07"},
            {"startDate": "2026-02-10", "endDate": "2026-02-16"},
            {"startDate": "2026-03-22", "endDate": "2026-03-28"},
        ]
        self.assertEqual(predict_cycle(short, today="2026-02-20")["averageCycleLength"], 21)
        self.assertEqual(predict_cycle(long, today="2026-04-01")["averageCycleLength"], 40)

    def test_invalid_entries_do_not_distort_predictions(self):
        cycles = [
            {"startDate": "not-a-date", "endDate": "2026-01-05"},
            {"startDate": "2026-02-01", "endDate": "2026-01-31"},
            {"startDate": "2026-03-01", "endDate": "2026-03-05"},
        ]
        self.assertEqual(len(normalize_cycles(cycles)), 1)
        self.assertEqual(
            predict_cycle(cycles, today="2026-03-12", fallback_cycle_length=27)["averageCycleLength"],
            27,
        )


if __name__ == "__main__":
    unittest.main()
