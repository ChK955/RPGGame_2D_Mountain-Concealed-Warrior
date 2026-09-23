import Phaser from 'phaser';

export interface InputIntent {
  move: number; jump: boolean; attack: boolean; skill: boolean; dash: boolean;
  potion: boolean; pause: boolean; debug: boolean;
}
export interface InputSource { sample(): InputIntent; reset(): void; destroy(): void }
export const emptyIntent = (): InputIntent => ({move:0,jump:false,attack:false,skill:false,dash:false,potion:false,pause:false,debug:false});

/** Keyboard is one adapter; a gamepad adapter can implement the same InputSource. */
export class InputController implements InputSource {
  private keys: Record<string, Phaser.Input.Keyboard.Key>;
  private readonly pressed = new Set<string>();
  constructor(scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard;
    if (!keyboard) throw new Error('Keyboard input is required');
    this.keys = keyboard.addKeys({left:'A',right:'D',leftArrow:'LEFT',rightArrow:'RIGHT',jump:'SPACE',attack:'J',skill:'K',dash:'SHIFT',potion:'Q',pause:'ESC',debug:'F1'}) as Record<string, Phaser.Input.Keyboard.Key>;
    // Keep edges until sampled: Phaser JustDown is cleared by a keyup in the same frame.
    Object.entries(this.keys).forEach(([name,key])=>key.on('down',()=>this.pressed.add(name)));
  }
  sample(): InputIntent {
    const just = (key: string) => this.pressed.delete(key);
    return {
      move: Number(this.keys.right.isDown || this.keys.rightArrow.isDown) - Number(this.keys.left.isDown || this.keys.leftArrow.isDown),
      jump:just('jump'), attack:just('attack'), skill:just('skill'), dash:just('dash'),
      potion:just('potion'), pause:just('pause'), debug:just('debug'),
    };
  }
  reset(): void { this.pressed.clear(); Object.values(this.keys).forEach(key => key.reset()); }
  destroy(): void { Object.values(this.keys).forEach(key => key.destroy()); }
}
