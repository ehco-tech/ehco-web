// Shared ad loading queue manager to prevent multiple ads from conflicting
// by setting the global atOptions variable simultaneously

type AdLoadTask = () => void;

class AdManager {
  private queue: AdLoadTask[] = [];
  private isLoading = false;

  public enqueue(task: AdLoadTask): void {
    this.queue.push(task);
    this.processQueue();
  }

  private processQueue(): void {
    if (this.isLoading || this.queue.length === 0) return;

    this.isLoading = true;
    const task = this.queue.shift();

    if (task) {
      task();
    }
  }

  public markComplete(): void {
    this.isLoading = false;
    this.processQueue();
  }
}

// Export a singleton instance
export const adManager = new AdManager();
