import React,{useEffect,useState} from 'react';
import {View,StyleSheet} from 'react-native';
import Animated,{Easing,useAnimatedStyle,useSharedValue,withTiming} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useDeviceContext} from '../../hooks/useDeviceContext';
import {useTwinStore} from '../../../store/useTwinStore';
import {ThemeColors,useAppTheme} from '../../../engine/colors';
import AwarenessBackground from './AwarenessBackground';
import EntityWaveform from './EntityWaveform';
import LivingEntity from './LivingEntity';
import LivingBeingSkia from './LivingBeingSkia';
import {usePresence} from '../../hooks/usePresence';
import {presenceToEntity} from '../../hooks/useEntityState';
const DARK=ThemeColors.dark;
const SKIA_PENDING='mytwin-skia-pending';const SKIA_BAN='mytwin-skia-banned-until';const SKIA_VERIFY_MS=2200;const SKIA_BAN_MS=15*60*1000;
function FallbackBeing({size,isDark}:{size:number;isDark:boolean}){return <View style={{width:size,height:size,alignItems:'center',justifyContent:'center'}}><View style={{width:size*.52,height:size*.52,borderRadius:size,backgroundColor:isDark?DARK.entityPurple:'#7C5FD4',shadowColor:DARK.entityCyan,shadowRadius:40,shadowOpacity:.6}}/></View>;}
class LayerBoundary extends React.Component<{name:string;fallback:React.ReactNode;children:React.ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return{failed:true};}componentDidCatch(e:unknown){try{console.warn('[STAGE]',this.props.name,String((e as any)?.message??e));}catch{}}render(){return this.state.failed?this.props.fallback:this.props.children;}}
export default function ConsciousStage({size=280}:{size?:number}){
 const {state:pres}=usePresence();const dev=useDeviceContext();const {isDark}=useAppTheme();const gfx=useTwinStore((s:any)=>s.gfx??'skia');const [safe,setSafe]=useState(false);const [skiaReady,setSkiaReady]=useState(false);const [banUntil,setBanUntil]=useState(0);const birth=useSharedValue(0);
 useEffect(()=>{let alive=true;(async()=>{try{const [manual, pending]=await Promise.all([AsyncStorage.getItem('mytwin_safe_mode'),AsyncStorage.getItem(SKIA_PENDING)]);if(!alive)return;setSafe(manual==='1');if(pending){const ts=Number(pending);if(Number.isFinite(ts)&&Date.now()-ts<5*60*1000){const until=Date.now()+SKIA_BAN_MS;await AsyncStorage.setItem(SKIA_BAN,String(until));setBanUntil(until);setSafe(true);}await AsyncStorage.removeItem(SKIA_PENDING);}const storedBan=Number(await AsyncStorage.getItem(SKIA_BAN));if(Number.isFinite(storedBan)&&storedBan>Date.now())setBanUntil(storedBan);}catch{}})();return()=>{alive=false;};},[]);
 useEffect(()=>{birth.value=withTiming(1,{duration:2200,easing:Easing.out(Easing.cubic)});},[]);
 const birthStyle=useAnimatedStyle(()=>({opacity:birth.value,transform:[{scale:.62+birth.value*.38}]}));
 const battery=Number(dev?.batteryLevel??1);const charging=!!dev?.isCharging;const lowPower=Number.isFinite(battery)&&battery<=.2&&!charging;const skiaCandidate=gfx==='skia'&&!safe&&!lowPower&&Date.now()>=banUntil;
 useEffect(()=>{if(!skiaCandidate)return;let alive=true;const started=String(Date.now());setSkiaReady(false);AsyncStorage.setItem(SKIA_PENDING,started).catch(()=>{});const timer=setTimeout(()=>{if(!alive)return;setSkiaReady(true);AsyncStorage.removeItem(SKIA_PENDING).catch(()=>{});},SKIA_VERIFY_MS);return()=>{alive=false;clearTimeout(timer);};},[skiaCandidate]);
 const effectiveSkia=skiaCandidate&&skiaReady;
 const entityState=presenceToEntity(pres);
 return <View style={[styles.wrap,{backgroundColor:isDark?DARK.bg:'#FAF9FF'}]} pointerEvents="box-none">
  <LayerBoundary name="background" fallback={<View style={StyleSheet.absoluteFill}/>}><AwarenessBackground dark={isDark} intensity={.5+(pres?.energy??.5)*.5} speaking={!!pres?.speaking}/></LayerBoundary>
  <Animated.View style={[styles.center,birthStyle]} pointerEvents="box-none"><LayerBoundary name="entity" fallback={<FallbackBeing size={size} isDark={isDark}/>}>
   {pres?(effectiveSkia?<LivingBeingSkia presence={pres} size={size} isDark={isDark} awaken={1}/>:<LivingEntity state={entityState.emotion} presence={pres} size={size} intensity={entityState.energy} speaking={entityState.speaking} listening={entityState.listening} isDark={isDark}/>):<FallbackBeing size={size} isDark={isDark}/>}</LayerBoundary></Animated.View>
  <View style={styles.wave} pointerEvents="none"><LayerBoundary name="wave" fallback={null}><EntityWaveform active={!!pres?.speaking||!!pres?.listening}/></LayerBoundary></View>
 </View>;
}
const styles=StyleSheet.create({wrap:{...StyleSheet.absoluteFillObject,alignItems:'center',justifyContent:'center'},center:{alignItems:'center',justifyContent:'center'},wave:{position:'absolute',bottom:4,left:0,right:0,alignItems:'center'}});
