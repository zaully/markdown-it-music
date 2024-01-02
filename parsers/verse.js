"use strict";

const { parseChord, isChord, isAnnotation } = require("../lib/chord");
const voicePattern = /^([a-zA-Z-_]+)([0-9]*):\s(.*)/;
const chinesePattern = /([\uff0c\u3002\uff01-\uff09\u4e00-\u9fff\u3400-\u4dbf\ufa0e\ufa0f\ufa11\ufa13\ufa14\ufa1f\ufa21\ufa23\ufa24\ufa27\ufa28\ufa29\u3006\u3007\ud840-\ud868\ud86a-\ud879\ud880-\ud887\udc00-\udfff\ud869\udc00-\udedf\udf00-\udfff\ud87a\udc00-\udfef\ud888\udc00-\udfaf\ufe00-\ufe0f\udb40\udd00-\uddef])/g;

function normalizeToken(instrument, token) {
  if (instrument == "c") {
    if (isChord(token)) {
      return parseChord(token);
    }
  }
  return token;
}

function calculateTokenLengthOffset(token) {
  return ((token || '').match(chinesePattern) || []).length;
}

function tokenize(instrument, data) {
  const re = /([^\s^|]+|\|)/g;
  const events = [];

  let match;
  var fullLengthsOffset = 0
  while ((match = re.exec(data))) {
    events.push({
      index: match.index + fullLengthsOffset,
      content: normalizeToken(instrument, match[0]),
    });
    fullLengthsOffset += calculateTokenLengthOffset(match[0])
  }

  return events;
}

function isVoiceLine(line) {
  return line.match(voicePattern);
}

function parseVoice(voice) {
  if (!voice) {
    return;
  }

  const match = voice.match(voicePattern);
  if (!match) {
    throw new Error(`Voice doesn't match ${voicePattern}: ${voice}`);
  }

  const instrument = match[1];
  const data = match[3];

  return tokenize(instrument, data);
}

function parsePhrase(phrase) {
  return phrase.split(/\n/).reduce((phrase, voice) => {
    if (voice) {
      const match = voice.match(voicePattern);
      const voiceName = `${match[1]}${match[2] || "1"}`;
      phrase.set(voiceName, parseVoice(voice));
    }
    return phrase;
  }, new Map());
}

function parseVerse(verse) {
  return verse.split(/[\n]{2,}/).map((phrase) => parsePhrase(phrase));
}

module.exports = {
  isVoiceLine,
  parseVerse,
};
