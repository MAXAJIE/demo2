from __future__ import annotations

THEME_PRESETS: dict[str, dict] = {
    "slate-mist": {
        "label": "Ink blue & cool stone",
        "typography": "editorial",
        "tokens": {
            "bg": "#F2F5F9",
            "surface": "#FAFBFD",
            "surface2": "#E5EBF2",
            "text": "#122033",
            "muted": "#5A6778",
            "primary": "#102A43",
            "onPrimary": "#F2F5F9",
            "accent": "#1E4E79",
            "border": "#D3DBE6",
            "ring": "#1D4E77",
        },
    },
    "carbon-sage": {
        "label": "Carbon Sage",
        "typography": "modern",
        "tokens": {
            "bg": "#2B3140",
            "surface": "#353C4D",
            "surface2": "#3E465A",
            "text": "#B8C7C0",
            "muted": "#9FB0A8",
            "primary": "#B8C7C0",
            "onPrimary": "#2B3140",
            "accent": "#8FA79B",
            "border": "#485065",
            "ring": "#8FA79B",
        },
    },
    "crimson-pearl": {
        "label": "Crimson Pearl",
        "typography": "editorial",
        "tokens": {
            "bg": "#F2F1ED",
            "surface": "#FAF9F6",
            "surface2": "#EDEBE5",
            "text": "#161616",
            "muted": "#5A5A56",
            "primary": "#710014",
            "onPrimary": "#F2F1ED",
            "accent": "#B38F6F",
            "border": "#DAD7CE",
            "ring": "#710014",
        },
    },
    "sandalwood-plum": {
        "label": "Sandalwood Plum",
        "typography": "editorial",
        "tokens": {
            "bg": "#E7D4BB",
            "surface": "#F1E5D2",
            "surface2": "#EBDCC7",
            "text": "#101211",
            "muted": "#5F574A",
            "primary": "#48252F",
            "onPrimary": "#E7D4BB",
            "accent": "#857861",
            "border": "#D3BEA2",
            "ring": "#48252F",
        },
    },
}


def resolve_theme(theme: dict | None) -> dict:
    """Return a complete theme object, filling gaps from the chosen preset."""
    theme = theme or {}
    preset_key = theme.get("preset") if theme.get("preset") in THEME_PRESETS else "slate-mist"
    preset = THEME_PRESETS[preset_key]
    tokens = {**preset["tokens"], **(theme.get("tokens") or {})}
    return {
        "preset": preset_key,
        "typography": theme.get("typography") or preset["typography"],
        "layout": theme.get("layout") or "hero-centered",
        "tokens": tokens,
    }
