const { supabase } = require('../backend/utils/supabase');

const snapshot = {
  name: 'అష్టభైరవ ఆపదుద్ధారక రక్షాహోమం',
  price: 1500,
  image: 'assets/images/pujas/bhairava.jpg'
};

const newNotes = `BookingID: 330246\nPuja: అష్టభైరవ ఆపదుద్ధారక రక్షాహోమం\nFamily: Niteeshreddy\nrazorpay_order:order_TaElErVn6UEhnu\nSnapshot: ${JSON.stringify(snapshot)}`;

supabase.from('bookings').update({ notes: newNotes }).eq('id', 'dab219d7-518d-478c-822a-4464a5e63dfc').then(({data, error}) => {
  console.log('Updated Astabhairava Homam:', error);
  process.exit(0);
});
