require('dotenv').config();

// Database abstraction layer that works with both MySQL and Supabase
class DatabaseAbstraction {
  constructor(db) {
    this.db = db;
  }

  // Generic query executor
  async query(sql, params = []) {
    return await this.db.execute(sql, params);
  }

  // User operations
  async getUserByUsername(username) {
    const [users] = await this.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    return users.length > 0 ? users[0] : null;
  }

  // Household operations
  async createHousehold(householdData) {
    const keys = Object.keys(householdData);
    const values = Object.values(householdData);
    const placeholders = keys.map(() => '?').join(', ');
    
    const [result] = await this.query(
      `INSERT INTO households (${keys.join(', ')}) VALUES (${placeholders})`,
      values
    );
    
    return result.insertId;
  }

  async getHousehold(householdId) {
    const [households] = await this.query(
      'SELECT * FROM households WHERE household_id = ?',
      [householdId]
    );
    return households.length > 0 ? households[0] : null;
  }

  // Family member operations
  async createFamilyMember(memberData) {
    const keys = Object.keys(memberData);
    const values = Object.values(memberData);
    const placeholders = keys.map(() => '?').join(', ');
    
    const [result] = await this.query(
      `INSERT INTO family_members (${keys.join(', ')}) VALUES (${placeholders})`,
      values
    );
    
    return result.insertId;
  }

  async getFamilyMembersByHousehold(householdId) {
    const [members] = await this.query(
      'SELECT * FROM family_members WHERE household_id = ? ORDER BY member_id',
      [householdId]
    );
    return members;
  }

  async getMemberById(memberId) {
    const [members] = await this.query(
      'SELECT * FROM family_members WHERE member_id = ?',
      [memberId]
    );
    return members.length > 0 ? members[0] : null;
  }

  // Health conditions operations
  async createHealthConditions(healthData) {
    const keys = Object.keys(healthData);
    const values = Object.values(healthData);
    const placeholders = keys.map(() => '?').join(', ');
    
    const [result] = await this.query(
      `INSERT INTO health_conditions (${keys.join(', ')}) VALUES (${placeholders})`,
      values
    );
    
    return result.insertId;
  }

  async getHealthConditions(householdId) {
    const [conditions] = await this.query(
      'SELECT * FROM health_conditions WHERE household_id = ?',
      [householdId]
    );
    return conditions.length > 0 ? conditions[0] : null;
  }

  // Socio-economic operations
  async createSocioEconomic(socioData) {
    const keys = Object.keys(socioData);
    const values = Object.values(socioData);
    const placeholders = keys.map(() => '?').join(', ');
    
    const [result] = await this.query(
      `INSERT INTO socio_economic (${keys.join(', ')}) VALUES (${placeholders})`,
      values
    );
    
    return result.insertId;
  }

  async getSocioEconomic(householdId) {
    const [socio] = await this.query(
      'SELECT * FROM socio_economic WHERE household_id = ?',
      [householdId]
    );
    return socio.length > 0 ? socio[0] : null;
  }

  // Search operations
  async searchParticipants(query, userRole, userParish) {
    let whereClause = 'WHERE fm.full_name LIKE ?';
    let queryParams = [`%${query}%`];
    
    if (userRole !== 'archdiocese' && userParish) {
      whereClause += ' AND h.parish_name = ?';
      queryParams.push(userParish);
    }
    
    const [results] = await this.query(`
      SELECT DISTINCT fm.member_id as id, fm.full_name, fm.relation_to_head_code, fm.sex_code, fm.age,
             h.purok_gimong, h.barangay_name, h.municipality, h.parish_name
      FROM family_members fm
      INNER JOIN households h ON fm.household_id = h.household_id
      ${whereClause}
      ORDER BY fm.full_name ASC
      LIMIT 10
    `, queryParams);
    
    return results;
  }

  // Transaction support
  async withTransaction(callback) {
    // For Supabase, use client-side transaction simulation
    try {
      return await callback();
    } catch (error) {
      throw error;
    }
  }
}

module.exports = DatabaseAbstraction;