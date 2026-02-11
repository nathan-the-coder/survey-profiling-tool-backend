require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

class DatabaseManager {
  constructor() {
    this.client = null;
    this.init();
  }

  async init() {
    // Use Supabase only
    console.log('Initializing Supabase connection...');
    this.client = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    console.log('Supabase client initialized');
  }

  getClient() {
    return this.client;
  }
}

const db = new DatabaseManager();

module.exports = { db };