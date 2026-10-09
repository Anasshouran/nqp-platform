/** توفير المستودعات لحزام الولاية — قابل للاستبدال في الاختبارات. */
import { createRepositories, type Repositories } from './repositories';
import { getApiRuntime } from './apiRegistry';

let repos: Repositories = createRepositories(getApiRuntime().client);

export function getRepos(): Repositories {
  return repos;
}

/** اختبارات فقط — استبدال المستودعات بمواعيد محددة. */
export function __setReposForTests(next: Repositories): void {
  repos = next;
}