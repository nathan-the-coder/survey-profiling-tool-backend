const { supabase } = require('./database');

class DatabaseAbstraction {
  constructor() {
    this.client = supabase;
  }

  #handleError(error) {
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    return null;
  }

  async getUserByUsername(username) {
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('username', username)
      .single();
    
    return this.#handleError(error) || data;
  }

  async getAllParishes() {
    const { data, error } = await this.client
      .from('users')
      .select('username')
      .order('username');
    
    if (error) throw error;
    return data.map(item => item.username);
  }

  async createHousehold(householdData) {
    const { data, error } = await this.client
      .from('households')
      .insert(householdData)
      .select()
      .single();
    
    if (error) throw error;
    return data.household_id;
  }

  async getHousehold(householdId) {
    const { data, error } = await this.client
      .from('households')
      .select('*')
      .eq('household_id', householdId)
      .single();
    
    return this.#handleError(error);
  }

  async createFamilyMember(memberData) {
    const { data, error } = await this.client
      .from('family_members')
      .insert(memberData)
      .select()
      .single();
    
    if (error) throw error;
    return data.member_id;
  }

  async getFamilyMembersByHousehold(householdId) {
    const { data, error } = await this.client
      .from('family_members')
      .select('*')
      .eq('household_id', householdId)
      .order('member_id');
    
    if (error) throw error;
    return data || [];
  }

  async getMemberById(memberId) {
    const { data, error } = await this.client
      .from('family_members')
      .select('*')
      .eq('member_id', memberId)
      .single();
    
    return this.#handleError(error);
  }

  async createHealthConditions(healthData) {
    const { data, error } = await this.client
      .from('health_conditions')
      .insert(healthData)
      .select()
      .single();
    
    if (error) throw error;
    return data.health_condition_id;
  }

  async getHealthConditions(householdId) {
    const { data, error } = await this.client
      .from('health_conditions')
      .select('*')
      .eq('household_id', householdId)
      .single();
    
    return this.#handleError(error);
  }

  async createSocioEconomic(socioData) {
    const { data, error } = await this.client
      .from('socio_economic')
      .insert(socioData)
      .select()
      .single();
    
    if (error) throw error;
    return data.socio_economic_id;
  }

  async getSocioEconomic(householdId) {
    const { data, error } = await this.client
      .from('socio_economic')
      .select('*')
      .eq('household_id', householdId)
      .single();
    
    return this.#handleError(error);
  }

  #buildParticipantQuery(queryBuilder, userRole, userParish) {
    queryBuilder = queryBuilder
      .from('family_members')
      .select(`
        member_id,
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
      `);

    if (userRole !== 'archdiocese' && userParish) {
      queryBuilder = queryBuilder.eq('households.parish_name', userParish);
    }

    return queryBuilder;
  }

  #formatParticipantResult(data) {
    return data.map(item => ({
      id: item.member_id,
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

  async searchParticipants(query, userRole, userParish) {
    let dbQuery = this.#buildParticipantQuery(this.client, userRole, userParish)
      .ilike('full_name', `%${query}%`)
      .limit(10)
      .order('full_name');

    const { data, error } = await dbQuery;
    if (error) throw error;

    return this.#formatParticipantResult(data);
  }

  async getAllParticipants(userRole, userParish) {
    let dbQuery = this.#buildParticipantQuery(this.client, userRole, userParish)
      .order('full_name');

    const { data, error } = await dbQuery;
    if (error) throw error;

    return this.#formatParticipantResult(data);
  }

  async withTransaction(callback) {
    return callback();
  }
}

module.exports = DatabaseAbstraction;