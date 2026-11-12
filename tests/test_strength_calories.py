"""Offline regression checks for the optional phase-weighted estimate."""

import pytest

from hevy2garmin.fit import calc_calories, calc_strength_calories, generate_fit


def test_reference_session():
    assert calc_strength_calories(112, 1761, 3724) == 528
    assert (
        calc_calories([89], 5485, 2026, {"weight_kg": 112, "birth_year": 1980, "vo2max": 45}) == 774
    )


@pytest.mark.parametrize("args", [(0, 1, 1), (112, -1, 1), (112, 1, float("nan"))])
def test_invalid_inputs(args):
    with pytest.raises(ValueError):
        calc_strength_calories(*args)


def test_default_and_opt_in(sample_workout, sample_profile, tmp_path):
    def run(method=None):
        profile = dict(sample_profile)
        if method:
            profile["calorie_method"] = method
        return generate_fit(sample_workout, [89], str(tmp_path / "test.fit"), profile=profile)

    legacy = run()
    assert run("keytel")["calories"] == legacy["calories"]
    strength = run("strength")
    assert strength["calories"] != legacy["calories"]
    for key in ("duration_s", "total_sets", "hr_samples", "avg_hr"):
        assert strength[key] == legacy[key]
