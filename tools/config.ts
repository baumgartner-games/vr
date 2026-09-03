/**
 * The config code on the command line.
 *
 * In the headset the code is copied to the clipboard; here it can be read,
 * changed and packed again — which is what happens when somebody sends their
 * settings over and wants the same thing for the other hand.
 *
 * ```bash
 * npm run config -- decode BGVR1…        # the settings behind a code
 * npm run config -- encode config.json   # a code from a file
 * npm run config -- mirror BGVR1… left   # left hand's poses onto the right
 * ```
 *
 * Node runs the TypeScript directly (22.6+ strips the types), so there is no
 * build step between a code and an answer.
 */

import { readFileSync } from 'node:fs';
import { decode, encode } from '../src/core/configCode.ts';
import { handPoseFromArray, handPoseToArray, mirrorHandPose } from '../src/core/handPose.ts';

const [command, ...rest] = process.argv.slice(2);

/** The shape the game writes; only what this script touches is spelled out. */
interface Config {
  hands?: {
    idle?: Record<string, number[]>;
    hold?: Record<string, Record<string, number[]>>;
  };
}

function usage(): never {
  console.error('Aufrufe:\n  decode <code>\n  encode <datei.json>\n  mirror <code> left|right');
  process.exit(1);
}

function read(code: string): Config {
  const value = decode(code);
  if (!value || typeof value !== 'object') {
    console.error('Kein gültiger Konfig-Code (beginnt er mit BGVR1?)');
    process.exit(2);
  }
  return value as Config;
}

switch (command) {
  case 'decode': {
    const code = rest[0];
    if (!code) usage();
    console.log(JSON.stringify(read(code), null, 2));
    break;
  }

  case 'encode': {
    const file = rest[0];
    if (!file) usage();
    const value = JSON.parse(readFileSync(file, 'utf8')) as unknown;
    const code = encode(value);
    console.log(code);
    console.error(
      `${JSON.stringify(value).length} Zeichen JSON → ${code.length} Zeichen Code`,
    );
    break;
  }

  case 'mirror': {
    const code = rest[0];
    const from = rest[1];
    if (!code || (from !== 'left' && from !== 'right')) usage();
    const to = from === 'left' ? 'right' : 'left';
    const config = read(code);
    const hands = (config.hands ??= {});

    const idle = hands.idle?.[from];
    if (idle) {
      hands.idle = { ...hands.idle, [to]: handPoseToArray(mirrorHandPose(handPoseFromArray(idle))) };
    }
    const hold = hands.hold?.[from];
    if (hold) {
      const mirrored: Record<string, number[]> = {};
      for (const [toolId, values] of Object.entries(hold)) {
        mirrored[toolId] = handPoseToArray(mirrorHandPose(handPoseFromArray(values)));
      }
      hands.hold = { ...hands.hold, [to]: { ...hands.hold?.[to], ...mirrored } };
    }

    console.log(encode(config));
    console.error(`${from} → ${to} gespiegelt`);
    break;
  }

  default:
    usage();
}
