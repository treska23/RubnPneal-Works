import Phaser from 'phaser';

export function loadSharedAssets(scene: Phaser.Scene) {
  // Walk
  scene.load.spritesheet('avatar_walk_sheet', '/sprites/avatar-walk.png', {
    frameWidth: 32,
    frameHeight: 32,
  });
  // Idle
  scene.load.spritesheet('avatar_idle_sheet', '/sprites/avatar-idle.png', {
    frameWidth: 32,
    frameHeight: 32,
  });
}

export function createSharedAnimations(scene: Phaser.Scene) {
  if (!scene.anims.exists('avatar_walk')) {
    scene.anims.create({
      key: 'avatar_walk',
      frames: scene.anims.generateFrameNumbers('avatar_walk_sheet', {
        start: 0,
        end: 5,
      }),
      frameRate: 8,
      repeat: -1,
    });
  }

  if (!scene.anims.exists('avatar_idle')) {
    scene.anims.create({
      key: 'avatar_idle',
      frames: scene.anims.generateFrameNumbers('avatar_idle_sheet', {
        start: 0,
        end: 3,
      }),
      frameRate: 2,
      repeat: -1,
    });
  }
}
