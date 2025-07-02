import { mount } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import { usePlayer } from '@/vue/usePlayer';

test('player does not move through walls', async () => {
  const map = [
    [1,1,1],
    [1,0,1],
    [1,1,1],
  ];
  const tileSize = 10;
  const wrapper = mount(defineComponent({
    setup() {
      return usePlayer(map, tileSize);
    },
    template: '<div></div>'
  }));
  await nextTick();
  const { state, update, setPosition } = wrapper.vm;
  // Place the player next to the wall so one update would collide
  setPosition(11.75, tileSize);
  const startX = state.x;
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' }));
  update();
  expect(state.x).toBe(startX);
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowRight' }));
  wrapper.unmount();
});
