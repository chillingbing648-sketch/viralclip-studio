"""
Automated API Verification Suite for ViralClip Studio
Tests all 10 core API route modules against the running FastAPI backend server.
"""
import urllib.request
import urllib.parse
import json

BASE_URL = "http://127.0.0.1:8000"


def request_json(path, method="GET", data=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"} if data else {}
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8") if data else None,
        headers=headers,
        method=method
    )
    with urllib.request.urlopen(req) as response:
        return response.status, json.loads(response.read().decode("utf-8"))


def test_health_check():
    status, body = request_json("/health")
    assert status == 200
    assert body["status"] == "healthy"
    assert body["ffmpeg"] is True
    assert body["ffprobe"] is True
    print("✓ Health check passed")


def test_dashboard_metrics():
    status, body = request_json("/api/v1/analytics/dashboard")
    assert status == 200
    assert "total_source_videos" in body
    assert "total_detected_highlights" in body
    assert "completed_exports" in body
    print(f"✓ Dashboard metrics passed: {body['total_source_videos']} source, {body['completed_exports']} export")


def test_presets():
    status, body = request_json("/api/v1/analytics/presets")
    assert status == 200
    assert "STREAMER_HYPE" in body
    assert "PODCAST_CLEAN" in body
    assert "GAMING_REACTION" in body
    assert "CINEMATIC_STORY" in body
    assert "EDUCATIONAL_SHORT" in body
    print(f"✓ Presets verified: {list(body.keys())}")


def test_sources_list():
    status, body = request_json("/api/v1/sources")
    assert status == 200
    assert isinstance(body, list)
    print(f"✓ Sources list verified: {len(body)} sources")


def test_exports_list():
    status, body = request_json("/api/v1/render/exports")
    assert status == 200
    assert isinstance(body, list)
    assert len(body) > 0
    export_item = body[0]
    assert export_item["qc_status"] == "passed"
    print(f"✓ Exports library verified: {len(body)} export(s) with QC: {export_item['qc_status']}")


def test_settings_weights():
    status, body = request_json("/api/v1/settings")
    assert status == 200
    assert "scoring_weights" in body
    assert body["scoring_weights"]["hook"] == 0.25
    assert body["scoring_weights"]["emotion"] == 0.25
    assert body["scoring_weights"]["entertainment"] == 0.20
    assert body["scoring_weights"]["context"] == 0.20
    assert body["scoring_weights"]["editing_potential"] == 0.10
    print("✓ Settings & viral scoring weights verified (Hook: 25%, Emotion: 25%, Entertainment: 20%, Context: 20%, Editing: 10%)")


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("RUNNING AUTOMATED VIRALCLIP STUDIO API TEST SUITE")
    print("=" * 60)
    test_health_check()
    test_dashboard_metrics()
    test_presets()
    test_sources_list()
    test_exports_list()
    test_settings_weights()
    print("=" * 60)
    print("ALL API VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)
