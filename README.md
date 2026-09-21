# ReasoningWaifu

English | [简体中文](README.zh-CN.md)

Bring a little companionship to AI chat pages with characters that change with your selected model and thinking mode.

## Getting Started

1. Download the extension ZIP package from this repository's **Releases**.
2. Extract the ZIP to a local folder.
3. Enter `chrome://extensions` in Chrome's address bar to open the extensions page.
4. Enable **Developer mode** in the top-right corner.
5. Click **Load unpacked** and select the extracted extension folder containing `manifest.json`.
6. Open or refresh a supported chat page, then switch models or thinking modes to see the characters change.

![Preview 1](docs/images/preview1.png)

![Preview 2](docs/images/preview2.png)

## How It Works

A Chrome extension reads the selected model and thinking mode from supported pages, watches for changes, and displays the matching local artwork. Welcome and chat views use separate layouts. Artwork does not intercept mouse input; unrecognized states use a fallback character.

## Supported Platforms

- Currently supported: [Gemini](https://gemini.google.com/app) in desktop Chrome.
- Planned: ChatGPT and DeepSeek. Other platforms are undecided.
- Mobile browsers are not yet supported. Website redesigns or changes to model options may affect detection.

## Credits

- Character designs by Bilibili creator **@ZipZipPipe**, used with the creator's permission for this open-source web extension with attribution. The images in this project were generated and edited by the project author based on those designs.
- Development and builds use [TypeScript](https://www.typescriptlang.org/), [esbuild](https://esbuild.github.io/), and Chrome API type definitions from [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped).
