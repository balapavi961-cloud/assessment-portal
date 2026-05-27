import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { GraduationCap } from 'lucide-react';

const Register = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    college: '',
    registrationNumber: '',
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast.success('Registration successful!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 to-indigo-900 p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <GraduationCap className="w-12 h-12 text-white mx-auto" />
          <h1 className="text-2xl font-bold text-white mt-2">Create Account</h1>
        </div>
        <div className="card animate-slide-up">
          <form onSubmit={handleSubmit} className="space-y-4">
            {['name', 'email', 'password', 'phone', 'college', 'registrationNumber'].map((field) => (
              <div key={field}>
                <label className="label capitalize">
                  {field === 'registrationNumber' ? 'Registration Number' : field}
                </label>
                <input
                  type={field === 'email' ? 'email' : field === 'password' ? 'password' : 'text'}
                  name={field}
                  className="input-field"
                  value={form[field]}
                  onChange={handleChange}
                  required={['name', 'email', 'password'].includes(field)}
                />
              </div>
            ))}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Register'}
            </button>
          </form>
          <p className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
