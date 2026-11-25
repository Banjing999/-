import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
};

const DB_NAME = process.env.DB_NAME || 'techforum';

const SQL = `
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE \`${DB_NAME}\`;

DROP TABLE IF EXISTS post_ai;
DROP TABLE IF EXISTS post_tags;
DROP TABLE IF EXISTS likes;
DROP TABLE IF EXISTS favorites;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS follows;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;

CREATE TABLE roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(200),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  nickname VARCHAR(50),
  avatar VARCHAR(255) DEFAULT 'https://api.dicebear.com/7.x/identicon/svg?seed=default',
  role_id INT DEFAULT 2,
  status TINYINT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_role_id (role_id)
) ENGINE=InnoDB;

CREATE TABLE categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL UNIQUE,
  icon VARCHAR(100),
  sort_order INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE posts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  category_id INT,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  views INT DEFAULT 0,
  likes INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  is_pinned TINYINT DEFAULT 0,
  is_essence TINYINT DEFAULT 0,
  status TINYINT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_category_id (category_id),
  INDEX idx_status (status)
) ENGINE=InnoDB;

CREATE TABLE comments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  post_id INT NOT NULL,
  user_id INT NOT NULL,
  parent_id INT DEFAULT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_post_id (post_id),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB;

CREATE TABLE favorites (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  post_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_post (user_id, post_id),
  INDEX idx_post_id (post_id)
) ENGINE=InnoDB;

CREATE TABLE tags (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE post_tags (
  post_id INT NOT NULL,
  tag_id INT NOT NULL,
  PRIMARY KEY (post_id, tag_id)
) ENGINE=InnoDB;

CREATE TABLE likes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  post_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_post (user_id, post_id)
) ENGINE=InnoDB;

CREATE TABLE post_ai (
  post_id INT PRIMARY KEY,
  summary TEXT,
  one_liner VARCHAR(255),
  summary_hash VARCHAR(64),
  review_status VARCHAR(20),
  review_risk VARCHAR(20),
  review_score INT,
  review_reason TEXT,
  reviewed_at DATETIME,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE follows (
  id INT PRIMARY KEY AUTO_INCREMENT,
  follower_id INT NOT NULL,
  following_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_follow (follower_id, following_id),
  INDEX idx_following (following_id)
) ENGINE=InnoDB;

CREATE TABLE messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sender_id INT NOT NULL,
  receiver_id INT NOT NULL,
  content TEXT NOT NULL,
  is_read TINYINT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_conversation (sender_id, receiver_id, created_at),
  INDEX idx_receiver_unread (receiver_id, is_read)
) ENGINE=InnoDB;
`;

// 示例帖子内容
const SAMPLE_POSTS = [
  {
    title: 'Vue 3 组合式 API 最佳实践分享',
    content: `Vue 3 引入的组合式 API 为我们提供了更灵活的代码组织方式。本文分享一些实际项目中的最佳实践。

1. 使用 setup 语法糖
推荐使用 script setup 语法，代码更简洁，无需手动 return 变量。

2. 逻辑抽离为 Composable
将可复用的逻辑抽取到独立的 composable 函数中，比如 useMouse、useFetch 等。`,
    category: '技术开发',
    tags: ['Vue', 'TypeScript'],
  },
  {
    title: '为什么宇宙是黑色的？——奥伯斯悖论浅析',
    content: `夜空为什么是黑暗的？这个看似简单的问题，实际上困扰了天文学家几个世纪。

无限宇宙的矛盾
如果宇宙是无限且永恒的，那么无论朝哪个方向看，视线都应该终结在某颗恒星上，夜空应该像白天一样明亮。

现代解释
宇宙的年龄有限（约 138 亿年），光需要时间传播；同时宇宙在加速膨胀，遥远星系的光被红移到不可见波段。两者共同导致了黑暗的夜空。`,
    category: '科学探索',
    tags: ['宇宙', '天文'],
  },
  {
    title: '《百年孤独》重读札记：孤独是一种宿命',
    content: `时隔五年重读马尔克斯的《百年孤独》，读完已是深夜，窗外下着雨，心里说不出的滋味。

布恩迪亚家族的轮回
七代人，重复的名字，重复的命运。乌尔苏拉在家族的尽头才恍然发现，那些看似偶然的悲剧，其实早已被羊皮卷写下。

孤独的多层含义
它不只是寂寞，更是一种无法被他人真正理解的隔绝。奥雷里亚诺上校在战争中制作小金鱼又融化重做，不正是我们每个人困在循环里的缩影吗？`,
    category: '文学阅读',
    tags: ['马尔克斯', '魔幻现实主义'],
  },
  {
    title: '《黑神话：悟空》三周目通关感受',
    content: `终于把三周目打穿了，隐藏 Boss 也全清，分享一下这一路的体验。

战斗系统
棍花、识破、蓄力三段——动作性拉满，Boss 战的压迫感是真的。尤其最后连战，我死了不下 50 次。

美术与文化
每一帧都可以当壁纸。观音院那段我直接截图做了桌面。作为国产游戏能做到这个水准，真心骄傲。

不足
剧情节奏稍快，部分 Boss 辨识度不够。瑕不掩瑜，年度游戏预定。`,
    category: '游戏动漫',
    tags: ['黑神话', '动作游戏'],
  },
  {
    title: '《繁花》：王家卫把上海拍活了',
    content: `熬夜刷完了《繁花》，这哪里是电视剧，简直是一部 30 集的电影。

镜头语言
每一帧都是精心构图，光影、色调、运镜，完全是电影级别的质感。胡歌的侧脸在雨夜的霓虹里，太有味道了。

时代感
90 年代的黄河路、和平饭店、三羊牌衬衫……还原度极高，老上海人看了会哭的那种。`,
    category: '影视音乐',
    tags: ['繁花', '王家卫'],
  },
  {
    title: '马拉松 PB 破 3 小时，我的训练方法分享',
    content: `刚刚在无锡马拉松跑了 2:58:34，终于破了 3 小时！两年的坚持没有白费。

训练计划
每周跑量 60-80 km，长距离 30+ km 每周一次，间歇跑 400m x 10 组，节奏跑 8 km。核心训练每周 3 次。

赛前调整
赛前两周减量到 40%，赛前 3 天碳水加载。比赛当天 3:30 起床，排空，喝能量胶。

补给策略
5 km 一根胶 + 电解质，15 km 水站只喝半杯，25 km 盐丸。个人感觉比纯胶方案更稳。`,
    category: '体育运动',
    tags: ['马拉松', '跑步'],
  },
  {
    title: '番茄牛腩炖了 3 小时，秘诀是加一勺红酒',
    content: `今天炖了一大锅番茄牛腩，邻居闻着香味来敲门了。

食材
牛腩 1 kg，番茄 5 个（要那种软的、沙瓤的），洋葱半个，姜片，冰糖，生抽老抽，红酒 1 小勺。

步骤要点
牛腩冷水下锅焯水去腥，一定要擦干水分再煎至金黄。番茄要提前用开水烫一下去皮，炒出红油再加牛腩。小火炖 3 小时，出锅前撒葱花。配米饭能吃三大碗。`,
    category: '美食烹饪',
    tags: ['家常菜', '炖菜'],
  },
  {
    title: '独自骑行川藏线 Day 15：翻越东达山',
    content: `海拔 5130 米的东达山，我骑了整整一天，眼泪不知道是缺氧还是感动。

装备建议
强烈建议带上氧气罐和保暖内衣，山顶风大到能把人吹走。冲锋衣一定要防水。

心态
不要急，累了就歇。川藏线不是比速度，是比谁能安全骑完。路上遇到的车友都是好兄弟。`,
    category: '旅行户外',
    tags: ['川藏线', '骑行'],
  },
  {
    title: '独居三年，我学会了这 5 件事',
    content: `一个人住的第三年，从一开始的害怕到现在的享受生活。

1. 学会做饭，外卖只能救急不能当饭吃
2. 保持房间整洁，环境整洁心情才好
3. 定期扔东西，断舍离真的很爽
4. 和自己对话，别让手机成为唯一的陪伴
5. 买个投影仪，周末在家就是快乐星球`,
    category: '生活琐事',
    tags: ['独居', '生活方式'],
  },
  {
    title: '异地恋第三年，我们分手了',
    content: `写下这篇的时候，她应该已经坐上回自己城市的高铁了。

不是因为不爱了，是真的累了。每个月攒钱买机票，凌晨的红眼航班，机场的拥抱，再见时的沉默。

给同样在异地的朋友一个建议：如果有可能，尽量在一个城市。感情经不起长期的物理距离。

祝她好，也祝我。`,
    category: '情感交流',
    tags: ['异地恋', '分手'],
  },
  {
    title: '考研二战上岸 985 计算机，经验分享',
    content: `去年考研 320 分没进复试，今年 401 分上岸。不是鸡汤，是实打实的方法。

公共课
政治 9 月开始，跟腿姐。英语每天背单词 + 做阅读真题，作文 11 月开始准备模板。

专业课（408）
这是拉分项。推荐王道四件套 + 历年真题至少刷两遍。数据结构和计组是重中之重。

心态
二战压力大，找一两个研友互相打气。每周半天休息，别把弦绷太紧。`,
    category: '校园学习',
    tags: ['考研', '408'],
  },
  {
    title: '裸辞从大厂回老家，现在过得怎么样？',
    content: `从字节裸辞回老家成都，已经半年了。说说真实感受。

收入
少了一半，但够花。成都生活成本比北京低太多。

生活
每天下午 6 点下班，周末可以去青城山爬山。有时间陪家人了，这是之前在大厂想都不敢想的。

建议
裸辞之前一定存够至少 12 个月生活费。想清楚自己想要什么，不要盲目跟风。`,
    category: '职场发展',
    tags: ['裸辞', '大厂'],
  },
];

async function run() {
  try {
    console.log('🔄 正在连接 MySQL...');
    const conn = await mysql.createConnection(DB_CONFIG);
    console.log('✅ 连接成功');

    // 执行建库建表 SQL
    console.log('🔄 正在初始化数据库结构...');
    const statements = SQL.split(';').filter(s => s.trim());
    for (const stmt of statements) {
      if (stmt.trim()) {
        await conn.query(stmt);
      }
    }
    console.log('✅ 数据库表创建完成');

    // 插入角色
    console.log('🔄 正在插入角色...');
    await conn.query('INSERT INTO roles (name, description) VALUES (?, ?)', ['admin', '系统管理员']);
    await conn.query('INSERT INTO roles (name, description) VALUES (?, ?)', ['user', '普通用户']);
    console.log('✅ 角色插入完成');

    // 插入用户
    console.log('🔄 正在创建示例用户...');
    const adminPwd = await bcrypt.hash('admin123', 10);
    const demoPwd = await bcrypt.hash('demo123', 10);
    const userPwd = await bcrypt.hash('user123', 10);

    await conn.query(
      'INSERT INTO users (username, email, password, nickname, role_id) VALUES (?, ?, ?, ?, ?)',
      ['admin', 'admin@techforum.com', adminPwd, '超级管理员', 1]
    );
    await conn.query(
      'INSERT INTO users (username, email, password, nickname, role_id) VALUES (?, ?, ?, ?, ?)',
      ['demo', 'demo@techforum.com', demoPwd, '演示用户', 2]
    );
    await conn.query(
      'INSERT INTO users (username, email, password, nickname, role_id) VALUES (?, ?, ?, ?, ?)',
      ['user', 'user@techforum.com', userPwd, '普通用户', 2]
    );
    console.log('✅ 用户创建完成');

    // 插入分类
    console.log('🔄 正在创建分类...');
    const categories = [
      ['技术开发', 'monitor', 1],
      ['科学探索', 'atom', 2],
      ['文学阅读', 'book-open', 3],
      ['游戏动漫', 'gamepad-2', 4],
      ['影视音乐', 'film', 5],
      ['体育运动', 'trophy', 6],
      ['美食烹饪', 'utensils-crossed', 7],
      ['旅行户外', 'map-pin', 8],
      ['生活琐事', 'home', 9],
      ['情感交流', 'heart', 10],
      ['校园学习', 'graduation-cap', 11],
      ['职场发展', 'briefcase', 12],
    ];
    for (const [name, icon, sort] of categories) {
      await conn.query('INSERT INTO categories (name, icon, sort_order) VALUES (?, ?, ?)', [name, icon, sort]);
    }
    console.log('✅ 分类创建完成');

    // 插入示例帖子
    console.log('🔄 正在创建示例帖子...');
    const [cats] = await conn.query('SELECT id, name FROM categories');
    const catMap = {};
    cats.forEach(c => catMap[c.name] = c.id);
    const [users] = await conn.query('SELECT id FROM users WHERE role_id = 2');
    const userId = users[0]?.id || 2;

    for (const post of SAMPLE_POSTS) {
      const catId = catMap[post.category];
      const [result] = await conn.query(
        'INSERT INTO posts (user_id, category_id, title, content) VALUES (?, ?, ?, ?)',
        [userId, catId, post.title, post.content]
      );

      // 标签
      for (const tag of post.tags) {
        const [existing] = await conn.query('SELECT id FROM tags WHERE name = ?', [tag]);
        let tagId;
        if (existing.length === 0) {
          const [t] = await conn.query('INSERT INTO tags (name) VALUES (?)', [tag]);
          tagId = t.insertId;
        } else {
          tagId = existing[0].id;
        }
        await conn.query('INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)', [result.insertId, tagId]);
      }
    }
    console.log('✅ 示例帖子创建完成');

    // 一些示例评论
    console.log('🔄 正在创建示例评论...');
    const [posts] = await conn.query('SELECT id FROM posts');
    const comments = [
      '写得很棒！学到了很多。',
      '感谢分享，正好在找这类资料。',
      '补充一点：也可以考虑用 Pinia 管理状态。',
      '收藏了，回头慢慢看。',
      '楼主讲的很详细，顶一下！',
    ];
    for (const post of posts) {
      const randCount = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < randCount; i++) {
        const randUser = users[Math.floor(Math.random() * users.length)]?.id || 2;
        const randComment = comments[Math.floor(Math.random() * comments.length)];
        await conn.query(
          'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',
          [post.id, randUser, randComment]
        );
      }
      await conn.query('UPDATE posts SET comment_count = ? WHERE id = ?', [randCount, post.id]);
    }
    console.log('✅ 示例评论创建完成');

    await conn.end();
    console.log('\n🎉 数据库初始化完成！');
    console.log('示例账号：');
    console.log('  管理员: admin / admin123');
    console.log('  普通用户: demo / demo123');
    console.log('  普通用户: user / user123');
  } catch (err) {
    console.error('❌ 初始化失败:', err.message);
    process.exit(1);
  }
}

run();
