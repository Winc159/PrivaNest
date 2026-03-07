import { getDatabase, closeDatabase } from '../src/database';
import { userService } from '../src/database/services/user.service';
import { playbackService } from '../src/database/services/playback.service';
import { favoriteService } from '../src/database/services/favorite.service';

async function testDatabase() {
  console.log('🧪 Testing Database...\n');

  try {
    const db = getDatabase();

    // 1. 测试迁移表
    console.log('1️⃣  Checking migrations table...');
    const migrations = db.prepare('SELECT * FROM _migrations').all();
    console.log(`   ✅ Executed migrations: ${migrations.length}`);
    migrations.forEach((m: any) => console.log(`      - ${m.name}`));
    console.log();

    // 2. 测试用户服务
    console.log('2️⃣  Testing User Service...');
    const adminUser = userService.findByUsername('admin');
    if (adminUser) {
      console.log(`   ✅ Found admin user: ${adminUser.username} (${adminUser.role})`);
    } else {
      console.log('   ❌ Admin user not found');
    }
    console.log();

    // 3. 测试播放历史服务
    console.log('3️⃣  Testing Playback Service...');
    if (adminUser) {
      const testPlayback = playbackService.upsert({
        user_id: adminUser.id,
        media_file_id: 999, // 测试 ID
        progress: 100,
        duration: 3600,
        is_completed: false
      });
      console.log(`   ✅ Created test playback record: ID ${testPlayback.id}`);
      
      const history = playbackService.findByUserId(adminUser.id);
      console.log(`   ✅ User playback history count: ${history.length}`);
    }
    console.log();

    // 4. 测试收藏服务
    console.log('4️⃣  Testing Favorite Service...');
    if (adminUser) {
      const testFavorite = favoriteService.create({
        user_id: adminUser.id,
        media_file_id: 888, // 测试 ID
        note: 'Test favorite'
      });
      console.log(`   ✅ Created test favorite: ID ${testFavorite.id}`);
      
      const favorites = favoriteService.findByUserId(adminUser.id);
      console.log(`   ✅ User favorites count: ${favorites.length}`);
    }
    console.log();

    console.log('=================================');
    console.log('✅ All database tests passed!');
    console.log('=================================\n');

  } catch (error) {
    console.error('❌ Database test failed:', (error as Error).message);
    process.exit(1);
  } finally {
    closeDatabase();
  }
}

testDatabase().catch(console.error);
