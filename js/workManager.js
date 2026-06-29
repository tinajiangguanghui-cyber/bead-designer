const STORAGE_KEY = 'bead_designer_works';

export class WorkManager {
  constructor() {
    this.works = this.loadWorks();
  }

  loadWorks() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  saveWorks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.works));
  }

  addWork(name, designData, thumbnail) {
    const work = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: name || `设计_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '')}`,
      designData,
      thumbnail: thumbnail || '',
      createdAt: new Date().toISOString(),
      beadCount: designData.beads ? designData.beads.length : 0
    };
    this.works.unshift(work);
    this.saveWorks();
    return work;
  }

  updateWork(id, designData, thumbnail) {
    const work = this.works.find(w => w.id === id);
    if (!work) return null;
    work.designData = designData;
    work.thumbnail = thumbnail || work.thumbnail;
    work.beadCount = designData.beads ? designData.beads.length : 0;
    work.updatedAt = new Date().toISOString();
    this.saveWorks();
    return work;
  }

  deleteWork(id) {
    this.works = this.works.filter(w => w.id !== id);
    this.saveWorks();
  }

  renameWork(id, newName) {
    const work = this.works.find(w => w.id === id);
    if (!work) return;
    work.name = newName;
    this.saveWorks();
  }

  getWork(id) {
    return this.works.find(w => w.id === id);
  }

  getAllWorks() {
    return [...this.works];
  }

  getCount() {
    return this.works.length;
  }
}
