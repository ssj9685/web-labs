interface ViewTransition {
  readonly finished: Promise<void>
  readonly ready: Promise<void>
  readonly types?: {
    add(type: string): void
  }
  readonly updateCallbackDone: Promise<void>
  skipTransition(): void
}

interface Document {
  startViewTransition(callback?: () => void | Promise<void>): ViewTransition
  activeViewTransition?: ViewTransition | null
}
