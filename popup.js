let allTweets = [];

// 加载推文
function loadTweets() {
  chrome.storage.local.get(['tweets'], (result) => {
    allTweets = result.tweets || [];
    renderTweets(allTweets);
  });
}

// 渲染推文列表
function renderTweets(tweets) {
  const container = document.getElementById('tweets');
  const emptyState = document.getElementById('empty');
  const countEl = document.getElementById('count');
  
  countEl.textContent = tweets.length;
  
  if (tweets.length === 0) {
    container.innerHTML = '';
    emptyState.classList.add('show');
    return;
  }
  
  emptyState.classList.remove('show');
  
  // 按保存时间倒序
  const sorted = [...tweets].sort((a, b) => 
    new Date(b.savedAt) - new Date(a.savedAt)
  );
  
  container.innerHTML = sorted.map(tweet => `
    <div class="tweet-item" data-url="${tweet.url}" data-id="${tweet.id}">
      <div class="tweet-header">
        <img class="tweet-avatar" src="${tweet.avatar || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22><circle cx=%2212%22 cy=%2212%22 r=%2212%22 fill=%22%23657786%22/></svg>'}" alt="">
        <div class="tweet-user">
          <div class="tweet-name">${escapeHtml(tweet.displayName)}</div>
          <div class="tweet-username">@${escapeHtml(tweet.username)}</div>
        </div>
        <button class="tweet-delete" data-id="${tweet.id}" title="删除">×</button>
      </div>
      <div class="tweet-text">${escapeHtml(tweet.text)}</div>
      ${tweet.images?.length ? `
        <div class="tweet-images">
          ${tweet.images.slice(0, 4).map(img => `<img src="${img}" alt="">`).join('')}
        </div>
      ` : ''}
      <div class="tweet-time">${formatTime(tweet.timestamp)}</div>
    </div>
  `).join('');
}

// HTML转义
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 格式化时间
function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// 搜索
document.getElementById('search').addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  if (!query) {
    renderTweets(allTweets);
    return;
  }
  const filtered = allTweets.filter(t => 
    t.text.toLowerCase().includes(query) ||
    t.username.toLowerCase().includes(query) ||
    t.displayName.toLowerCase().includes(query)
  );
  renderTweets(filtered);
});

// 点击推文打开链接
document.getElementById('tweets').addEventListener('click', (e) => {
  // 删除按钮
  if (e.target.classList.contains('tweet-delete')) {
    e.stopPropagation();
    const id = e.target.dataset.id;
    deleteTweet(id);
    return;
  }
  
  // 打开推文
  const item = e.target.closest('.tweet-item');
  if (item) {
    chrome.tabs.create({ url: item.dataset.url });
  }
});

// 删除单条推文
function deleteTweet(id) {
  allTweets = allTweets.filter(t => t.id !== id);
  chrome.storage.local.set({ tweets: allTweets }, () => {
    renderTweets(allTweets);
  });
}

// 导出
document.getElementById('exportBtn').addEventListener('click', () => {
  const data = JSON.stringify(allTweets, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `x-tweets-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

// 清空
document.getElementById('clearBtn').addEventListener('click', () => {
  if (confirm('确定要清空所有推文历史吗？')) {
    chrome.storage.local.set({ tweets: [] }, () => {
      allTweets = [];
      renderTweets([]);
    });
  }
});

// 初始化
loadTweets();
