// 已保存的推文ID集合，避免重复
const savedTweetIds = new Set();

// 从存储中加载已保存的ID
chrome.storage.local.get(['tweets'], (result) => {
  if (result.tweets) {
    result.tweets.forEach(t => savedTweetIds.add(t.id));
  }
});

// 检查当前是否在推文详情页
function isStatusPage() {
  return /\/status\/\d+/.test(window.location.pathname);
}

// 从URL提取推文ID
function getTweetIdFromUrl() {
  const match = window.location.pathname.match(/\/([^/]+)\/status\/(\d+)/);
  return match ? { username: match[1], tweetId: match[2] } : null;
}

// 提取当前详情页的推文数据
function extractCurrentTweet() {
  const urlInfo = getTweetIdFromUrl();
  if (!urlInfo) return null;
  
  // 已保存则跳过
  if (savedTweetIds.has(urlInfo.tweetId)) return null;
  
  try {
    // 找到主推文（详情页第一条）
    const tweetElement = document.querySelector('[data-testid="tweet"]');
    if (!tweetElement) return null;
    
    // 获取显示名称
    const displayName = tweetElement.querySelector('[data-testid="User-Name"] a span')?.textContent || urlInfo.username;
    
    // 获取推文内容
    const tweetTextEl = tweetElement.querySelector('[data-testid="tweetText"]');
    const tweetText = tweetTextEl?.textContent || '';
    
    // 获取时间
    const timeEl = tweetElement.querySelector('time');
    const timestamp = timeEl?.getAttribute('datetime') || new Date().toISOString();
    
    // 获取头像
    const avatar = tweetElement.querySelector('[data-testid="Tweet-User-Avatar"] img')?.src || '';
    
    // 获取图片
    const images = Array.from(tweetElement.querySelectorAll('[data-testid="tweetPhoto"] img'))
      .map(img => img.src)
      .filter(src => src && !src.includes('emoji'));
    
    return {
      id: urlInfo.tweetId,
      username: urlInfo.username,
      displayName,
      text: tweetText,
      timestamp,
      avatar,
      images,
      url: window.location.href,
      savedAt: new Date().toISOString()
    };
  } catch (e) {
    console.error('提取推文失败:', e);
    return null;
  }
}

// 保存推文到存储
function saveTweet(tweet) {
  if (!tweet || savedTweetIds.has(tweet.id)) return;
  
  savedTweetIds.add(tweet.id);
  
  chrome.storage.local.get(['tweets'], (result) => {
    const tweets = result.tweets || [];
    tweets.push(tweet);
    
    // 限制最多保存 5000 条
    if (tweets.length > 5000) {
      tweets.shift();
    }
    
    chrome.storage.local.set({ tweets });
    console.log('X Tweet History: 已保存推文', tweet.id);
  });
}

// 尝试保存当前页面的推文
function trySaveCurrentTweet() {
  if (!isStatusPage()) return;
  
  // 等待页面加载完成
  setTimeout(() => {
    const tweet = extractCurrentTweet();
    if (tweet) {
      saveTweet(tweet);
    }
  }, 1500);
}

// 监听URL变化（X是SPA，需要监听路由变化）
let lastUrl = location.href;

const urlObserver = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    trySaveCurrentTweet();
  }
});

urlObserver.observe(document.body, {
  childList: true,
  subtree: true
});

// 初始检查
trySaveCurrentTweet();

console.log('X Tweet History 插件已加载 - 点击进入推文详情页时自动保存');
