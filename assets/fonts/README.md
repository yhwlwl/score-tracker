# UI fonts

The optional **清晰黑体** and **书卷宋体** presets use self-hosted subsets of Noto Sans SC and Noto Serif SC. The default preset continues using the platform font. Font loading uses `font-display: swap`; no font CDN is needed. The setting-card previews use separate 1.6–1.8 KB samples; a full typeface only loads after it is selected.

Sources (SIL Open Font License 1.1):

- https://github.com/google/fonts/tree/main/ofl/notosanssc
- https://github.com/google/fonts/tree/main/ofl/notoserifsc

The accompanying OFL files retain the original copyright and license. The derivative family names are **Score Sans** and **Score Serif**.

The subsets include Latin, punctuation, GB2312 Chinese characters, and CJK characters present in the UI source. Uncommon characters fall back to the system font. The weight axis covers 400–700.

To rebuild, download the two upstream variable TTF files, install `fonttools` and `brotli`, then run:

```sh
python design/subset-ui-fonts.py /path/to/NotoSansSC.ttf /path/to/NotoSerifSC.ttf
```

The theme colors are adapted to the existing semantic tokens, informed by Radix Colors (https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale). Open Props (https://open-props.style/) was reviewed as a reference for typography scale and CSS variables. Neither adds a runtime dependency.
