const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();

app.use(cors());
app.use(express.json());

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- AUTH ROUTES ---

// Signup
app.post('/api/signup', async (req, res) => {
    const { name, email, password, bio } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    
    const { data: existingUser } = await supabase.from('users').select('id').eq('email', email).single();
    if (existingUser) {
        return res.status(400).json({ error: 'Email already exists.' });
    }
    
    const { data: newUser, error } = await supabase.from('users').insert([{ name, email, password, bio }]).select().single();
    
    if (error) return res.status(500).json({ error: error.message });
    
    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json({ user: userWithoutPassword, token: `fake-token-for-${newUser.id}` });
});

// Login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    
    const { data: user, error } = await supabase.from('users').select('*').eq('email', email).eq('password', password).single();
    
    if (error || !user) {
        return res.status(401).json({ error: 'Invalid credentials.' });
    }
    
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, token: `fake-token-for-${user.id}` });
});

// Get Profile
app.get('/api/profile/:id', async (req, res) => {
    const userId = parseInt(req.params.id);
    
    const { data: user, error: userError } = await supabase.from('users').select('*').eq('id', userId).single();
    
    if (userError || !user) {
        return res.status(404).json({ error: 'User not found.' });
    }
    
    const { data: userSkills } = await supabase.from('skills').select('*').eq('user_id', userId);
    
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({ 
        user: userWithoutPassword, 
        skills: userSkills ? userSkills.map(s => ({
            id: s.id, userId: s.user_id, userName: s.user_name, offer: s.offer, request: s.request, category: s.category
        })) : [] 
    });
});


// --- APP ROUTES ---

// Get all skills
app.get('/api/skills', async (req, res) => {
    const { search, category } = req.query;
    
    let query = supabase.from('skills').select('*').order('created_at', { ascending: false });

    if (category && category !== 'All') {
        query = query.eq('category', category);
    }

    if (search) {
        query = query.or(`offer.ilike.%${search}%,request.ilike.%${search}%`);
    }

    const { data: skills, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    
    res.json(skills.map(s => ({
        id: s.id, userId: s.user_id, userName: s.user_name, offer: s.offer, request: s.request, category: s.category
    })));
});

// Post a new skill
app.post('/api/skills', async (req, res) => {
    const { userId, offer, request, category } = req.body;
    
    const { data: user, error: userError } = await supabase.from('users').select('*').eq('id', parseInt(userId)).single();
    
    if (userError || !user || !offer || !request || !category) {
        return res.status(400).json({ error: 'All fields are required and user must exist.' });
    }

    const { data: newSkill, error } = await supabase.from('skills').insert([{
        user_id: user.id,
        user_name: user.name,
        offer,
        request,
        category
    }]).select().single();
    
    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json({
        id: newSkill.id, userId: newSkill.user_id, userName: newSkill.user_name, offer: newSkill.offer, request: newSkill.request, category: newSkill.category
    });
});

// Send an exchange request
app.post('/api/requests', async (req, res) => {
    const { fromUserId, targetSkillId, offeredSkill } = req.body;
    
    const { data: targetSkill } = await supabase.from('skills').select('*').eq('id', parseInt(targetSkillId)).single();
    const { data: fromUser } = await supabase.from('users').select('*').eq('id', parseInt(fromUserId)).single();

    if (!targetSkill) return res.status(404).json({ error: 'Skill not found.' });
    if (!fromUser) return res.status(404).json({ error: 'Sender not found.' });
    if (!offeredSkill) return res.status(400).json({ error: 'Offered skill is required.' });

    const { data: newRequest, error } = await supabase.from('exchange_requests').insert([{
        from_user_id: fromUser.id,
        from_user_name: fromUser.name,
        target_user_id: targetSkill.user_id,
        target_user_name: targetSkill.user_name,
        target_skill_offer: targetSkill.offer,
        offered_skill: offeredSkill,
        status: 'Pending'
    }]).select().single();
    
    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json({
        id: newRequest.id,
        fromUserId: newRequest.from_user_id,
        fromUserName: newRequest.from_user_name,
        targetUserId: newRequest.target_user_id,
        targetUserName: newRequest.target_user_name,
        targetSkillOffer: newRequest.target_skill_offer,
        offeredSkill: newRequest.offered_skill,
        status: newRequest.status
    });
});

// Get exchange requests (My Exchanges)
app.get('/api/requests', async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.json([]);

    const uid = parseInt(userId);
    
    const { data: requests, error } = await supabase.from('exchange_requests')
        .select('*')
        .or(`from_user_id.eq.${uid},target_user_id.eq.${uid}`)
        .order('created_at', { ascending: false });
        
    if (error) return res.status(500).json({ error: error.message });

    res.json(requests.map(r => ({
        id: r.id,
        fromUserId: r.from_user_id,
        fromUserName: r.from_user_name,
        targetUserId: r.target_user_id,
        targetUserName: r.target_user_name,
        targetSkillOffer: r.target_skill_offer,
        offeredSkill: r.offered_skill,
        status: r.status
    })));
});

// Update request status
app.patch('/api/requests/:id', async (req, res) => {
    const { status } = req.body;
    
    const { data: request, error } = await supabase.from('exchange_requests')
        .update({ status })
        .eq('id', parseInt(req.params.id))
        .select()
        .single();
        
    if (error) return res.status(500).json({ error: error.message });

    res.json({
        id: request.id,
        fromUserId: request.from_user_id,
        fromUserName: request.from_user_name,
        targetUserId: request.target_user_id,
        targetUserName: request.target_user_name,
        targetSkillOffer: request.target_skill_offer,
        offeredSkill: request.offered_skill,
        status: request.status
    });
});

// --- MESSAGING ROUTES ---

// Get messages for an exchange
app.get('/api/messages/:exchangeId', async (req, res) => {
    const { userId } = req.query;
    const exchangeId = parseInt(req.params.exchangeId);
    
    const { data: request } = await supabase.from('exchange_requests').select('*').eq('id', exchangeId).single();
    
    if (!request) return res.status(404).json({ error: 'Exchange not found.' });
    if (request.status !== 'Accepted') return res.status(403).json({ error: 'Chat is only available for accepted exchanges.' });
    
    const uid = parseInt(userId);
    if (request.from_user_id !== uid && request.target_user_id !== uid) {
        return res.status(403).json({ error: 'Unauthorized.' });
    }

    const { data: chatMessages, error } = await supabase.from('messages')
        .select('*')
        .eq('exchange_id', exchangeId)
        .order('timestamp', { ascending: true });
        
    if (error) return res.status(500).json({ error: error.message });

    res.json(chatMessages.map(m => ({
        id: m.id,
        exchangeId: m.exchange_id,
        senderId: m.sender_id,
        text: m.text,
        timestamp: m.timestamp
    })));
});

// Post a message
app.post('/api/messages/:exchangeId', async (req, res) => {
    const { userId, text } = req.body;
    const exchangeId = parseInt(req.params.exchangeId);
    
    const { data: request } = await supabase.from('exchange_requests').select('*').eq('id', exchangeId).single();
    
    if (!request) return res.status(404).json({ error: 'Exchange not found.' });
    if (request.status !== 'Accepted') return res.status(403).json({ error: 'Chat is only available for accepted exchanges.' });
    
    const uid = parseInt(userId);
    if (request.from_user_id !== uid && request.target_user_id !== uid) {
        return res.status(403).json({ error: 'Unauthorized.' });
    }

    const { data: newMessage, error } = await supabase.from('messages').insert([{
        exchange_id: exchangeId,
        sender_id: uid,
        text
    }]).select().single();
    
    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json({
        id: newMessage.id,
        exchangeId: newMessage.exchange_id,
        senderId: newMessage.sender_id,
        text: newMessage.text,
        timestamp: newMessage.timestamp
    });
});

// Export for Vercel serverless
module.exports = app;
