import {Component} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './styles.css';
class Boundary extends Component{
  state={e:null};
  static getDerivedStateFromError(e){return{e}}
  render(){return this.state.e?<div className="shell"><div className="card err"><h2>Something went wrong</h2><p>{this.state.e.message}</p><a className="btn" href="#/" onClick={()=>setTimeout(()=>location.reload())}>Reload</a></div></div>:this.props.children}
}
createRoot(document.getElementById('root')).render(<Boundary><App/></Boundary>);
