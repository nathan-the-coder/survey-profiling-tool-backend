require('dotenv').config();

// Database abstraction layer using Supabase client
class DatabaseAbstraction {
  constructor(db) {
    this.db = db.getClient();
  }

  // User operations
  async getUserByUsername(username) {
    const { data, error } = await this.db
      .from('users')
      .select('*')
      .eq('username', username)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }
    
    return data;
  }

  // Household operations
  async createHousehold(householdData) {
    const { data, error } = await this.db
      .from('households')
      .insert(householdData)
      .select()
      .single();
    
    if (error) throw error;
    
    return data.household_id;
  }

  async getHousehold(householdId) {
    const { data, error } = await this.db
      .from('households')
      .select('*')
      .eq('household_id', householdId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    return data;
  }

  // Family member operations
  async createFamilyMember(memberData) {
    const { data, error } = await this.db
      .from('family_members')
      .insert(memberData)
      .select()
      .single();
    
    if (error) throw error;
    
    return data.member_id;
  }

  async getFamilyMembersByHousehold(householdId) {
    const { data, error } = await this.db
      .from('family_members')
      .select('*')
      .eq('household_id', householdId)
      .order('member_id');
    
    if (error) throw error;
    
    return data || [];
  }

  async getMemberById(memberId) {
    const { data, error } = await this.db
      .from('family_members')
      .select('*')
      .eq('member_id', memberId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    return data;
  }

  // Health conditions operations
  async createHealthConditions(healthData) {
    const { data, error } = await this.db
      .from('health_conditions')
      .insert(healthData)
      .select()
      .single();
    
    if (error) throw error;
    
    return data.health_condition_id;
  }

  async getHealthConditions(householdId) {
    const { data, error } = await this.db
      .from('health_conditions')
      .select('*')
      .eq('household_id', householdId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    return data;
  }

  // Socio-economic operations
  async createSocioEconomic(socioData) {
    const { data, error } = await this.db
      .from('socio_economic')
      .insert(socioData)
      .select()
      .single();
    
    if (error) throw error;
    
    return data.socio_economic_id;
  }

  async getSocioEconomic(householdId) {
    const { data, error } = await this.db
      .from('socio_economic')
      .select('*')
      .eq('household_id', householdId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    return data;
  }

  // Search operations
  async searchParticipants(query, userRole, userParish) {
    let dbQuery = this.db
      .from('family_members')
      .select(`
        member_id as id,
        full_name,
        relation_to_head_code,
        sex_code,
        age,
        households!inner (
          purok_gimong,
          barangay_name,
          municipality,
          parish_name
        )
      `)
      .ilike('full_name', `%${query}%`)
      .limit(10)
      .order('full_name');

    // Filter by parish if not archdiocese
    if (userRole !== 'archdiocese' && userParish) {
      dbQuery = dbQuery.eq('households.parish_name', userParish);
    }

    const { data, error } = await dbQuery;
    
    if (error) throw error;
    
    // Flatten the nested household data
    return data.map(item => ({
      id: item.id,
      full_name: item.full_name,
      relation_to_head_code: item.relation_to_head_code,
      sex_code: item.sex_code,
      age: item.age,
      purok_gimong: item.households.purok_gimong,
      barangay_name: item.households.barangay_name,
      municipality: item.households.municipality,
      parish_name: item.households.parish_name
    }));
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