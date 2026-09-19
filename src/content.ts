import { observeGemini, readSnapshot } from './gemini';
import { CharacterRenderer } from './renderer';

// Private to the content script's isolated execution environment.
const scope = globalThis as typeof globalThis & { __reasoningWaifuDispose?: () => void };
scope.__reasoningWaifuDispose?.();
const renderer = new CharacterRenderer(key => chrome.runtime.getURL(`assets/gemini/${key}.svg`));
const update = () => {
  try {
    const snapshot = readSnapshot();
    if (snapshot) renderer.update(snapshot.parent, snapshot.key, snapshot.placement);
    else renderer.hide();
  } catch {
    renderer.hide();
  }
};
const disconnect = observeGemini(update);
scope.__reasoningWaifuDispose = () => { disconnect(); renderer.hide(); };
update();
