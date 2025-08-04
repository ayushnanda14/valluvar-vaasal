let audioInstance;

export const playNotificationSound = () => {
  try {
    if (typeof window === 'undefined') return; // SSR guard

    if (!audioInstance) {
      audioInstance = new Audio('/sounds/notification.mp3');
      audioInstance.preload = 'auto';
    }
    // Rewind and play so consecutive dings all work
    audioInstance.currentTime = 0;
    audioInstance.play().catch(() => {
      /* autoplay restrictions – ignore */
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to play notification sound', err);
  }
};
