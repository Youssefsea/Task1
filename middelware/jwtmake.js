const jwt=require('jsonwebtoken');
require('dotenv').config();
const createToken=(user)=>
{
    const token=jwt.sign({id:user.id,name:user.name,email:user.email,role:user.role},process.env.JWT_SECRET,{expiresIn:'2h'});
    return token;
}
module.exports={createToken};