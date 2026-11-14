// 실행 취소/다시 실행 — 악보 전체를 JSON 문자열 스냅샷으로 저장한다.

export class History {
  constructor(limit = 300) {
    this.limit = limit;
    this.undoStack = [];
    this.redoStack = [];
  }

  get canUndo() { return this.undoStack.length > 0; }
  get canRedo() { return this.redoStack.length > 0; }

  /** 변경 직전 상태를 기록한다. entry = { score: string, sel } */
  record(entry) {
    this.undoStack.push(entry);
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.redoStack.length = 0;
  }

  /** current(지금 상태)를 다시 실행 쪽에 넣고 이전 상태를 돌려준다. */
  undo(current) {
    if (!this.canUndo) return null;
    this.redoStack.push(current);
    return this.undoStack.pop();
  }

  redo(current) {
    if (!this.canRedo) return null;
    this.undoStack.push(current);
    return this.redoStack.pop();
  }

  clear() {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }
}
