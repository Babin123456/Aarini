import unittest

from cycle_prediction import normalize_cycles, predict_cycle, _std_deviation, _detect_irregularity


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

    def test_confidence_window_present_in_response(self):
        cycles = [
            {"startDate": "2026-03-01", "endDate": "2026-03-05"},
            {"startDate": "2026-03-29", "endDate": "2026-04-02"},
            {"startDate": "2026-04-26", "endDate": "2026-04-30"},
        ]
        result = predict_cycle(cycles, today="2026-05-10")
        self.assertIn("confidenceWindow", result)
        window = result["confidenceWindow"]
        self.assertIn("earliest", window)
        self.assertIn("latest", window)
        self.assertIn("marginDays", window)
        self.assertGreaterEqual(window["marginDays"], 1)
        self.assertLess(window["earliest"], result["nextPeriodStart"])
        self.assertGreater(window["latest"], result["nextPeriodStart"])

    def test_confidence_window_wider_for_irregular_cycles(self):
        regular = [
            {"startDate": "2026-01-01", "endDate": "2026-01-05"},
            {"startDate": "2026-01-29", "endDate": "2026-02-02"},
            {"startDate": "2026-02-26", "endDate": "2026-03-02"},
        ]
        irregular = [
            {"startDate": "2026-01-01", "endDate": "2026-01-05"},
            {"startDate": "2026-01-22", "endDate": "2026-01-26"},
            {"startDate": "2026-02-25", "endDate": "2026-03-01"},
        ]
        regular_margin = predict_cycle(regular, today="2026-03-10")["confidenceWindow"]["marginDays"]
        irregular_margin = predict_cycle(irregular, today="2026-03-10")["confidenceWindow"]["marginDays"]
        self.assertGreater(irregular_margin, regular_margin)

    def test_irregularity_note_flagged_for_large_deviation(self):
        cycles = [
            {"startDate": "2026-01-01", "endDate": "2026-01-05"},
            {"startDate": "2026-01-29", "endDate": "2026-02-02"},
            {"startDate": "2026-02-26", "endDate": "2026-03-02"},
            {"startDate": "2026-04-15", "endDate": "2026-04-19"},
        ]
        result = predict_cycle(cycles, today="2026-04-25")
        self.assertIsNotNone(result["irregularityNote"])
        self.assertIn("longer", result["irregularityNote"])

    def test_no_irregularity_note_for_consistent_cycles(self):
        cycles = [
            {"startDate": "2026-01-01", "endDate": "2026-01-05"},
            {"startDate": "2026-01-29", "endDate": "2026-02-02"},
            {"startDate": "2026-02-26", "endDate": "2026-03-02"},
            {"startDate": "2026-03-26", "endDate": "2026-03-30"},
        ]
        result = predict_cycle(cycles, today="2026-04-05")
        self.assertIsNone(result["irregularityNote"])

    def test_std_deviation_calculation(self):
        self.assertAlmostEqual(_std_deviation([28, 28, 28]), 0.0)
        self.assertGreater(_std_deviation([21, 28, 35]), 0)

    def test_detect_irregularity_threshold(self):
        self.assertIsNone(_detect_irregularity([28, 29, 27]))
        self.assertIsNotNone(_detect_irregularity([28, 28, 40]))
        self.assertIn("longer", _detect_irregularity([28, 28, 40]))
        self.assertIsNotNone(_detect_irregularity([28, 28, 16]))
        self.assertIn("shorter", _detect_irregularity([28, 28, 16]))


if __name__ == "__main__":
    unittest.main()
