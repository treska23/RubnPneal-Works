import { mount } from '@vue/test-utils';
import { defineComponent, reactive, nextTick } from 'vue';
import { levelMaps } from '@/vue/maze';
import { useGhostAI } from '@/vue/useGhostAI';

const tileSize = 32;

function createWrapper(player: any) {
  return mount(defineComponent({
    setup() {
      return useGhostAI(levelMaps[0].map(r => [...r]), tileSize, player);
    },
    template: '<div></div>'
  }));
}

test('ghost path targets the player', async () => {
  const player = reactive({
    x: tileSize * 7,
    y: tileSize * 10,
    width: tileSize * 0.8,
    height: tileSize * 0.8,
  });
  const wrapper = createWrapper(player);
  await nextTick();
  const ghost = wrapper.vm.ghosts[0];
  expect(ghost.path.length).toBeGreaterThan(0);
  const last = ghost.path[ghost.path.length - 1];
  expect(last).toEqual({ r: 10, c: 7 });
  wrapper.unmount();
});

test('detects collision with player', async () => {
  const player = reactive({
    x: tileSize,
    y: tileSize,
    width: tileSize * 0.8,
    height: tileSize * 0.8,
  });
  const wrapper = createWrapper(player);
  await nextTick();
  const ghost = wrapper.vm.ghosts[0];
  ghost.x = player.x;
  ghost.y = player.y;
  expect(wrapper.vm.collidesWithPlayer()).toBe(true);
  wrapper.unmount();
});
