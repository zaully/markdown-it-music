"use strict";

const { convertVerseToEventsWithOpts } = require("../parsers/events.js");
const { parseVoicing } = require("../lib/voicing");
const { guitarChordbook } = require("../lib/chordbook");
const { Chord, compareChords } = require("../lib/chord.js");

const invisibleRe = /^[_]+$/


const chordIdentifierPattern = new RegExp(
  [
    "^",
    "(_*)",
    "([-0%])",
    "([.*])?",
    "$",
  ].join(""),
);

class ChordsRenderer {
  constructor(opts) {
    this.voiceOrder = [];
    this.transposeAmount = 0;
    this.transposeSharpFlatPref = '#';
    this.currentPhraseIndex = 0;
    this.chordIndex = 0;
    this.chordsUsed = [];

    this.setOptions(opts);
  }

  setOptions(opts) {
    if (!opts) return;

    this.transposeAmount = +opts.transpose.replace(/[^0-9-]/g, '') || 0;
    this.transposeSharpFlatPref = opts.transpose.replace(/[0-9-]/g, '');

    if (opts.chords) {
      Object.entries(opts.chords).forEach(([chord, shorthands]) => {
        if (typeof shorthands === "string") {
          shorthands = [shorthands];
        }
        guitarChordbook.set(chord, shorthands.map(parseVoicing));
      });
    }
  }

  isChordUsed(chord) {
    for (let i = 0; i < this.chordsUsed.length; i++) {
      if (compareChords(this.chordsUsed[i], chord) === 0) {
        return true;
      }
    }
    return false;
  }

  createEventHTMLChordChart(lines, instruments, width) {
    let chartDiv = '';

    lines.forEach((line) => {
      // create line div for each event
      chartDiv += this.createLineDiv(line, instruments, width);
      this.currentPhraseIndex++;
    });

    return chartDiv;
  }

  createLineDiv(line, instruments, width) {
    let lineDiv = `<div class="line" style="scroll-snap-stop: always; scroll-snap-align: start; width: `;
    lineDiv += width
    lineDiv += `px">`

    line.forEach((event) => {
      lineDiv += this.createEventDiv(event, instruments);
    });

    return lineDiv + "</div>";
  }

  createEventDiv(event, instruments) {
    let eventDiv = `<div class="event">`;

    const currentVoiceOrder = this.voiceOrder[this.currentPhraseIndex];

    if (event.length > currentVoiceOrder.length) {
      console.error(
        "There are more voices than the voice order displays. Some data may be lost.",
      );
    }

    currentVoiceOrder.forEach((voice) => {
      if (instruments.has(voice) || voice === "c" || voice === "c1") {
        if (event[0] && voice === event[0].voice) {
          eventDiv += this.createVoiceDiv(event.shift());
        } else {
          const emptyDiv = "<div> </div>";
          eventDiv += emptyDiv;
        }
      }
    });
    return eventDiv + `</div>`;
  }

  shouldBeInvisile(content) {
    return ((content || '').match(invisibleRe) || []).length === 1;
  }

  parseContentChordIdentifiers(content) {
    return content.match(chordIdentifierPattern);
  }

  isContentBarLine(voice) {
    if (voice.content instanceof Chord) {
      return false;
    }
    return voice.content.toString() === '|';
  }

  createContentSpan(voice) {
    const content = voice.content.toString();
    if (voice.content instanceof Chord) {
      // no need
      // if (guitarChordbook.has(content)) {
      //   if (!this.isChordUsed(voice.content)) {
      //     this.chordsUsed.push(voice.content);
      //   }
      //   const id = `${this.chordIndex++}`;
      //   const attrValue = voice.content.toAttributeValue();
      //   return (
      //     `<span id="chord-${id}" class="chord"` +
      //     ` onmouseover="showTooltip('chord-${id}', '${attrValue}')"` +
      //     ` onmouseout="hideTooltip('${attrValue}')"` +
      //     `>${content}</span>`
      //   );
      // } else {
      //   return `<span class="chord highlight">${content}</span>`;
      // }
      // return `<span class="chord">${content}</span>`;
      const chord = voice.content;
      const root = chord.root;
      const quality = chord.quality || '';
      const bass = chord.bass || '';
      const duration = chord.duration || '';
      const dotted = chord.dotted || '';
      
      // Count underscores in duration for underline styling
      const underscoreCount = (duration.match(/_/g) || []).length;
      const underlineClass = underscoreCount > 0 ? ` chord-underline-${underscoreCount}` : '';
      
      // Create structured chord layout with sections matching the image layout
      let chordHTML = `<span class="chord">`;
      chordHTML += `<span class="chord-container${underlineClass}">`;
      
      // Root note section (large, spans both rows on the left)
      chordHTML += `<span class="chord-root">${root}</span>`;
      
      // Quality section (top-right, small)
      chordHTML += `<span class="chord-quality">${quality}</span>`;
      
      // Bass note section (bottom-right, for slash chords)
      if (bass) {
        chordHTML += `<span class="chord-bass">/${bass}</span>`;
      }
      
      chordHTML += '</span>';
      
      // Dotted section (appears after the chord container)
      if (dotted) {
        chordHTML += `<span class="chord-dotted">${dotted}</span>`;
      }
      
      chordHTML += '</span>';
      
      return chordHTML;
    }
    if (this.shouldBeInvisile(content)) {
      return " ".repeat(content.length);
    }
    const identifierMatch = this.parseContentChordIdentifiers(content);
    if (identifierMatch) {
      const duration = identifierMatch[1] || '';  // Underscores
      const identifier = identifierMatch[2];       // The -, 0, or % character
      const dotted = identifierMatch[3];
      
      // Count underscores for underline styling
      const underscoreCount = duration.length;
      const underlineClass = underscoreCount > 0 ? ` chord-underline-${underscoreCount}` : '';
      
      let contentHTML = `<span class="chord">`;
      contentHTML += `<span class="chord-container${underlineClass}">`;
      contentHTML += `<span class="chord-root">${identifier}</span>`;
      contentHTML += '</span>';
      if (dotted) {
        contentHTML += `<span class="chord-dotted">${dotted}</span>`;
      }
      contentHTML += '</span>';
      return contentHTML;
    }
    return content;
  }

  createVoiceDiv(voice) {
    if (voice.content instanceof Chord) {
      voice.content = voice.content.transpose(this.transposeAmount, this.transposeSharpFlatPref);
    }

    if (this.isContentBarLine(voice)) {
      return (
        `<div class="${voice.voice} bar">` +
        " ".repeat(voice.offset) +
        this.createContentSpan(voice) +
        `</div>`
      );
    }
    return (
      `<div class="${voice.voice}">` +
      " ".repeat(voice.offset) +
      this.createContentSpan(voice) +
      `</div>`
    );
  }

  renderVerse(verse, opts) {
    this.setOptions(opts);

    this.voiceOrder = verse.map((phrase) => Array.from(phrase.keys()));
    this.currentPhraseIndex = 0;

    const lines = convertVerseToEventsWithOpts(verse, opts);

    return this.createEventHTMLChordChart(lines, opts.instrumentsConfig.instrumentsToRender, opts.maxWidth);
  }
}

module.exports = ChordsRenderer;
