import datetime

from opencontext.context_consumption.generation.realtime_activity_monitor import (
    RealtimeActivityMonitor,
)
from opencontext.context_processing.processor.screenshot_processor import ScreenshotProcessor
from opencontext.models.context import (
    ContextProperties,
    ExtractedData,
    ProcessedContext,
    RawContextProperties,
    Vectorize,
)
from opencontext.models.enums import ContentFormat, ContextSource, ContextType


def make_raw_context() -> RawContextProperties:
    return RawContextProperties(
        content_format=ContentFormat.IMAGE,
        source=ContextSource.SCREENSHOT,
        create_time=datetime.datetime(2026, 5, 1, 12, 0, 0),
        content_path="/tmp/missing-screenshot.png",
        additional_info={"window": "screen"},
    )


def test_normalize_vlm_response_accepts_top_level_item_list():
    raw_context = make_raw_context()

    items = ScreenshotProcessor._normalize_vlm_response(
        [
            {
                "context_type": "activity_context",
                "title": "current_user查看录屏界面",
                "summary": "current_user正在查看MineContext的录屏界面。",
                "keywords": ["MineContext", "录屏"],
            }
        ],
        raw_context=raw_context,
        raw_llm_response='[{"context_type":"activity_context"}]',
    )

    assert len(items) == 1
    assert items[0]["title"] == "current_user查看录屏界面"


def test_normalize_vlm_response_accepts_top_level_wrapped_item_list():
    raw_context = make_raw_context()

    items = ScreenshotProcessor._normalize_vlm_response(
        [{"items": [{"context_type": "activity_context", "title": "wrapped"}]}],
        raw_context=raw_context,
        raw_llm_response='[{"items":[{"context_type":"activity_context"}]}]',
    )

    assert len(items) == 1
    assert items[0]["title"] == "wrapped"


def test_normalize_vlm_response_falls_back_for_unstructured_text():
    raw_context = make_raw_context()

    items = ScreenshotProcessor._normalize_vlm_response(
        "current_user正在玩《饥荒》，处于夜晚第19天，没有光源导致被攻击。",
        raw_context=raw_context,
        raw_llm_response=(
            "<think>分析截图</think>\n"
            "现在生成context：current_user正在玩《饥荒》，处于夜晚第19天，没有光源导致被攻击。"
        ),
    )

    assert len(items) == 1
    assert items[0]["context_type"] == "activity_context"
    assert "饥荒" in items[0]["summary"]
    assert items[0]["keywords"] == ["llm_unstructured_response"]


def test_normalize_vlm_response_falls_back_for_empty_flattened_list():
    raw_context = make_raw_context()

    items = ScreenshotProcessor._normalize_vlm_response(
        ["activity_context: current_user正在查看MineContext录屏错误"],
        raw_context=raw_context,
        raw_llm_response='["activity_context: current_user正在查看MineContext录屏错误"]',
    )

    assert len(items) == 1
    assert items[0]["context_type"] == "activity_context"
    assert "MineContext" in items[0]["summary"]


def make_processed_context(
    context_type: ContextType = ContextType.ACTIVITY_CONTEXT,
) -> ProcessedContext:
    now = datetime.datetime(2026, 5, 1, 12, 0, 0)
    raw_context = make_raw_context()
    return ProcessedContext(
        properties=ContextProperties(
            raw_properties=[raw_context],
            create_time=now,
            update_time=now,
            event_time=now,
            enable_merge=True,
            is_happend=True,
        ),
        extracted_data=ExtractedData(
            title="current_user查看录屏界面",
            summary="current_user正在查看MineContext的录屏界面。",
            keywords=["MineContext", "录屏"],
            context_type=context_type,
            importance=5,
            confidence=8,
        ),
        vectorize=Vectorize(
            content_format=ContentFormat.TEXT,
            text="current_user查看录屏界面 current_user正在查看MineContext的录屏界面。",
        ),
    )


def test_normalize_merge_response_flattens_wrapped_lists():
    item = make_processed_context()

    result = ScreenshotProcessor._normalize_merge_response(
        [
            {
                "items": [
                    {
                        "merge_type": "new",
                        "merged_ids": [item.id],
                        "data": {"title": item.extracted_data.title},
                    }
                ]
            },
            ["unexpected-string"],
        ],
        context_type=ContextType.ACTIVITY_CONTEXT,
        fallback_items=[item],
    )

    assert result["items"] == [
        {
            "merge_type": "new",
            "merged_ids": [item.id],
            "data": {"title": item.extracted_data.title},
        }
    ]


def test_normalize_merge_response_falls_back_to_new_items_for_invalid_shape():
    item = make_processed_context()

    result = ScreenshotProcessor._normalize_merge_response(
        ["zhang的世界"],
        context_type=ContextType.ACTIVITY_CONTEXT,
        fallback_items=[item],
    )

    assert result["items"][0]["merge_type"] == "new"
    assert result["items"][0]["merged_ids"] == [item.id]


def test_normalize_merge_response_falls_back_to_new_items_for_empty_response():
    item = make_processed_context()

    result = ScreenshotProcessor._normalize_merge_response(
        None,
        context_type=ContextType.ACTIVITY_CONTEXT,
        fallback_items=[item],
    )

    assert result["items"][0]["merge_type"] == "new"
    assert result["items"][0]["merged_ids"] == [item.id]


def test_normalize_activity_summary_accepts_wrapped_list():
    result = RealtimeActivityMonitor._normalize_summary_response(
        [
            {
                "title": "调试MineContext",
                "description": "current_user正在查看录屏错误。",
                "representative_context_ids": ["ctx-1"],
                "category_distribution": {"debug": 2, "game": 1},
            }
        ],
        fallback_description="fallback",
    )

    assert result["title"] == "调试MineContext"
    assert result["representative_context_ids"] == ["ctx-1"]
    assert result["category_distribution"] == {"debug": 0.67, "game": 0.33}


def test_normalize_activity_summary_falls_back_for_unstructured_text():
    result = RealtimeActivityMonitor._normalize_summary_response(
        "current_user主要在调试MineContext录屏处理失败。",
        fallback_description="fallback",
    )

    assert result["title"] == "Recent Activities"
    assert "MineContext" in result["description"]
    assert result["category_distribution"] == {}
