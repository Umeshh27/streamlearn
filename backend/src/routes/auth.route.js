import express from 'express';
const router = express.Router();

router.get('/signin', (req, res) => {
  res.send('SignIn Route');
});

router.get('/signup', (req, res) => {
  res.send('SignUp Route');
});   

router.get('/logout', (req, res) => {
  res.send('Logout Route');
});

export default router;