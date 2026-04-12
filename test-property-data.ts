import { db } from './src/db/index.ts';
import { properties } from './src/db/schema.ts';

async function testPropertyData() {
  try {
    console.log('Testing property data...\n');

    // Get all properties
    const allProperties = await db.select().from(properties);
    console.log('All properties:');
    allProperties.forEach(prop => {
      console.log(`- ${prop.name} (slug: ${prop.slug})`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

testPropertyData();