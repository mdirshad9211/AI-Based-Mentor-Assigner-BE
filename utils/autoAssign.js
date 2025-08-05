import User from "../models/user.model.js";
import Ticket from "../models/ticket.model.js";

/**
 * Automatically assign a ticket to the best matching moderator based on skills
 * @param {string} ticketId - The ID of the ticket to assign
 * @returns {Promise<Object|null>} - The assigned moderator or null if no match found
 */
export const autoAssignTicket = async (ticketId) => {
    try {
        // Get the ticket with its related skills
        const ticket = await Ticket.findById(ticketId);
        if (!ticket || !ticket.relatedSkills || ticket.relatedSkills.length === 0) {
            console.log("Ticket not found or has no related skills for auto-assignment");
            return null;
        }

        // Get all moderators with their skills
        const moderators = await User.find({ 
            role: "moderator",
            skills: { $exists: true, $ne: [] }
        });

        if (moderators.length === 0) {
            console.log("No moderators with skills found");
            return null;
        }

        // Find the best matching moderator
        let bestModerator = null;
        let highestSkillMatch = 0;

        for (const moderator of moderators) {
            // Count how many ticket skills match moderator skills with flexible matching
            const matchingSkills = ticket.relatedSkills.filter(ticketSkill => 
                moderator.skills.some(modSkill => {
                    const ticketSkillNormalized = ticketSkill.toLowerCase().replace(/[^a-z0-9]/g, '');
                    const modSkillNormalized = modSkill.toLowerCase().replace(/[^a-z0-9]/g, '');
                    
                    // Check if skills match with various patterns:
                    // 1. Direct inclusion (js matches nodejs, javascript)
                    // 2. Reverse inclusion (nodejs matches js)
                    // 3. Exact match after normalization
                    return modSkillNormalized.includes(ticketSkillNormalized) ||
                           ticketSkillNormalized.includes(modSkillNormalized) ||
                           modSkillNormalized === ticketSkillNormalized ||
                           // Special cases for common abbreviations
                           (ticketSkillNormalized === 'js' && (modSkillNormalized.includes('javascript') || modSkillNormalized.includes('nodejs') || modSkillNormalized.includes('reactjs'))) ||
                           (ticketSkillNormalized === 'node' && modSkillNormalized.includes('nodejs')) ||
                           (ticketSkillNormalized === 'react' && modSkillNormalized.includes('reactjs')) ||
                           (modSkillNormalized.includes('js') && ticketSkillNormalized.includes('javascript'));
                })
            );

            const matchScore = matchingSkills.length;
            
            // Also consider moderator's current workload
            const assignedTicketsCount = await Ticket.countDocuments({ 
                assignedTo: moderator._id,
                status: { $in: ["TODO", "IN_PROGRESS"] }
            });

            // Calculate final score: skill match weight 70%, workload weight 30%
            const workloadScore = Math.max(0, 5 - assignedTicketsCount); // Lower assigned tickets = higher score
            const finalScore = (matchScore * 0.7) + (workloadScore * 0.3);

            if (finalScore > highestSkillMatch) {
                highestSkillMatch = finalScore;
                bestModerator = moderator;
            }
        }

        if (bestModerator && highestSkillMatch > 0) {
            // Assign the ticket to the best moderator
            const updatedTicket = await Ticket.findByIdAndUpdate(
                ticketId,
                { 
                    assignedTo: bestModerator._id,
                    status: "IN_PROGRESS"
                },
                { new: true }
            ).populate("assignedTo", ["email", "_id", "role", "skills"])
             .populate("createdBy", ["email", "_id", "role"]);

            console.log(`Auto-assigned ticket ${ticketId} to moderator ${bestModerator.email} (score: ${highestSkillMatch})`);
            return {
                moderator: bestModerator,
                ticket: updatedTicket,
                matchScore: highestSkillMatch
            };
        }

        console.log("No suitable moderator found for auto-assignment");
        return null;

    } catch (error) {
        console.error("Error in auto-assignment:", error.message);
        return null;
    }
};

/**
 * Extract potential skills from ticket title and description using simple keyword matching
 * @param {string} title - Ticket title
 * @param {string} description - Ticket description
 * @returns {Array<string>} - Array of detected skills
 */
export const extractSkillsFromTicket = (title, description) => {
    const text = `${title} ${description}`.toLowerCase();
    
    // Enhanced skill keywords with variations and synonyms
    const skillMappings = {
        // JavaScript variations
        'JavaScript': ['javascript', 'js', 'ecmascript', 'es6', 'es2015', 'es2020', 'vanilla js'],
        'Node.js': ['nodejs', 'node.js', 'node', 'express', 'npm', 'yarn'],
        'React': ['react', 'reactjs', 'react.js', 'jsx', 'react native'],
        'Vue': ['vue', 'vuejs', 'vue.js', 'nuxt', 'nuxtjs'],
        'Angular': ['angular', 'angularjs', 'ng', 'typescript angular'],
        
        // Python variations  
        'Python': ['python', 'py', 'django', 'flask', 'fastapi', 'python3'],
        'Django': ['django', 'python django', 'django rest'],
        'Flask': ['flask', 'python flask'],
        
        // Database variations
        'MongoDB': ['mongodb', 'mongo', 'mongoose', 'nosql'],
        'MySQL': ['mysql', 'sql', 'mariadb'],
        'PostgreSQL': ['postgresql', 'postgres', 'psql'],
        'Redis': ['redis', 'cache', 'memory store'],
        
        // Frontend variations
        'HTML': ['html', 'html5', 'markup'],
        'CSS': ['css', 'css3', 'stylesheets', 'sass', 'scss', 'less'],
        'Responsive Design': ['responsive', 'mobile first', 'responsive design'],
        'Bootstrap': ['bootstrap', 'bootstrap4', 'bootstrap5'],
        'Tailwind': ['tailwind', 'tailwindcss', 'utility css'],
        
        // Backend variations
        'API': ['api', 'rest api', 'restful', 'web api', 'microservices'],
        'GraphQL': ['graphql', 'graph ql', 'apollo'],
        'Authentication': ['auth', 'authentication', 'jwt', 'oauth', 'login'],
        
        // Cloud and DevOps variations
        'AWS': ['aws', 'amazon web services', 'ec2', 's3', 'lambda'],
        'Docker': ['docker', 'containerization', 'containers'],
        'Git': ['git', 'github', 'gitlab', 'version control'],
        
        // Mobile variations
        'Mobile': ['mobile', 'android', 'ios', 'react native', 'flutter', 'ionic'],
        
        // Other
        'Testing': ['testing', 'unit test', 'jest', 'mocha', 'selenium'],
        'Security': ['security', 'cybersecurity', 'encryption', 'ssl'],
        'Performance': ['performance', 'optimization', 'speed', 'caching']
    };

    const detectedSkills = [];
    
    // Check each skill mapping
    Object.entries(skillMappings).forEach(([skill, variations]) => {
        const found = variations.some(variation => {
            // Check for whole word matches to avoid false positives
            const regex = new RegExp(`\\b${variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
            return regex.test(text);
        });
        
        if (found) {
            detectedSkills.push(skill);
        }
    });

    // Remove duplicates and return
    return [...new Set(detectedSkills)];
};
