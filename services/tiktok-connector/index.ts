type GiftDetail = { tier: number; user?: string };

class TikTokConnector extends EventTarget {
  private connected = false;

  connect() {
    // In a real implementation we'd open a WebSocket or similar to TikTok's Live API
    this.connected = true;
    this.dispatchEvent(new Event('connected'));
    console.log('TikTokConnector: connected (mock)');
  }

  disconnect() {
    this.connected = false;
    this.dispatchEvent(new Event('disconnected'));
    console.log('TikTokConnector: disconnected (mock)');
  }

  simulateGift(tier: number) {
    // For testing: emit a 'gift' event with a tier
    const detail: GiftDetail = { tier, user: 'tester' };
    this.dispatchEvent(new CustomEvent('gift', { detail }));
  }

  isConnected() {
    return this.connected;
  }
}

const connector = new TikTokConnector();
export default connector;
