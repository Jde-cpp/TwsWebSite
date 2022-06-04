import {Component,EventEmitter,Input,Output, Inject, OnDestroy, ViewChild, ElementRef, OnInit, AfterViewInit, HostBinding, ViewContainerRef, ComponentRef} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TickDetails } from '../../../services/Tick';
import { TwsService } from '../../../services/tws.service';
import { IErrorService } from 'jde-framework';

import * as ib2 from 'jde-cpp/ib'; import IB = ib2.Jde.Markets.Proto;
import * as IbResults from 'jde-cpp/results'; import Results = IbResults.Jde.Markets.Proto.Results;
import * as IbRequests from 'jde-cpp/requests'; import Requests = IbRequests.Jde.Markets.Proto.Requests;
import { Subject, timeout } from 'rxjs';
import { WatchTableComponent } from '../watch-table';
import { WatchCol } from './watch-col';
import { Columns } from '../../../pages/watch/watch-content';

@Component({selector: 'watch-row', templateUrl: './watch-row.html', styleUrls:['./watch-row.scss', '../watch-table.scss']})
export class WatchRowComponent implements OnInit, AfterViewInit
{
	@HostBinding('class.watchRow') public hostClass:boolean=true;
	static i:number=0;
	index:number;
	constructor( private tws : TwsService, @Inject('IErrorService') private cnsle: IErrorService, private decimalPipe: DecimalPipe )
	{
		this.index = WatchRowComponent.i++;
		//console.log( `row( ${this.index} )` );
	}
	//class="watchRow"
	ngOnInit(){ /* this.viewPromise = Promise.resolve(true);*/ }
	ngAfterViewInit()
	{

		this.addColumns();
	}

	addColumns()
	{
		for( let c of this.parent.settings.columns )
		{
			const ref:ComponentRef<WatchCol> = this.row.createComponent<WatchCol>( WatchCol ); let instance = ref.instance;
			instance.name = Columns[c];
			if( [Columns.Ask,Columns.AskSize,Columns.Bid,Columns.BidSize,Columns.Change,Columns.Last].includes( c ) )
				instance.parent = this;
			else if( c==Columns.Symbol )
				this.symbolCol = instance;
			else if( c==Columns.Shares )
				this.sharesCol = instance;
			else if( c==Columns.AvgPrice )
				this.avgPriceCol = instance;
		}
	}

	clear()
	{
		this.shares = this.tick = undefined;
	}
	set( shares:number, avgPrice:number, tick:TickDetails )
	{
		if( this.sharesCol )
			this.sharesCol.number = shares;
		if( this.avgPriceCol )
			this.avgPriceCol.number = avgPrice;
		this.tick = tick;
	}
	viewable( columnId:string ):boolean
	{
		return this.parent.viewable( columnId );
	}
	//ngOnDestroy(){ this.unsubscribe(); }

	editColumn( columnId:string )
	{
		this.editItem = columnId;
		this.editEmitter.emit( columnId ? this.rowId : -1 );
		setTimeout( ()=>
		{
			if( columnId=="symbol" )
			{
				this.symbolInput.nativeElement.focus();
				//console.log( `focus ${this.index}` );
				this.symbolInput.nativeElement.select();
			}
		 },0);

	}
	isEditing( columnId:string ){ return this.editItem==columnId; }
	setSymbol( symbol:string )
	{
		this.editItem = null;
		if( (!symbol && !this.tick) || symbol==this.tick?.detail.contract.symbol )
			return;
		this.parent.onChangeSymbol( this, symbol );
	}

	sharesFocusOut( shares:number )
	{
		//debugger;
		this.editItem = null;
		if( this.shares != shares )
		{
			this.shares = shares;
			this.parent.onChangeShares( this );
		}
	}
	sharesFocus( shares:number )
	{
		this.editItem = 'shares'
	}
	avgPriceFocusOut( price:number )
	{
		//debugger;
		this.editItem = null;
		if( this.avgPrice != price )
		{
			this.avgPrice = price;
			this.parent.onChangeAvgPrice( this );
		}
	}
	avgPriceFocus( shares:number )
	{
		this.editItem = 'avgPrice';
	}


	//this.tick = null;
/*		this.unsubscribe();
		let details:Results.IContractDetails[] = [];
		this.tws.reqContractDetails( {symbol: symbol} ).subscribe(
		{
			next: value=>{ details.push(value);},
			complete: ()=>
			{
				if( details.length==1 )
				{
					var item = details[0];
					this.tick = new TickDetails( item );
					this.subscribe();
				}
				else
					this.cnsle.error( `${symbol} return ${details.length} records.` );
			},
			error: e=>{ this.cnsle.error(e.message, e); }
		});
	}
	subscribe()
	{
		//TODO find out if market is closed then get historical info.
		this.unsubscribe();
		const isMarketOpen = MarketUtilities.isMarketOpen( this.detail );
		this.subscription = this.tws.reqMktData( this.detail.contract.id, [Requests.ETickList.Inventory, (isMarketOpen ? Requests.ETickList.PlPrice : Requests.ETickList.MiscStats)], false );
		this.subscription.subscribe2( this.tick );
	}
	unsubscribe(){ if( this.subscription ) this.tws.cancelMktDataSingle(this.subscription); }
*/
	get contractId():number{ return this.detail?.contract.id; }
	get detail():Results.IContractDetail{ return this.tick?.detail; }/*@Input() set detail(x){ this.tick = x ? new TickDetails(x) : null; }*/
	get displayChange():string{ const tick=this.tick; return tick ? `${this.decimalPipe.transform(tick.change, '1.2-2')}  (${this.decimalPipe.transform(tick?.change/tick?.close*100, '1.1-1')}%)` : null;}
	//get displayShort():string{ return this.fundamentals?.sharesOutstanding && this.settingsSymbol ? $ {this.decimalPipe.transform(this.settingsSymbol.shortInterest/this.fundamentals.sharesOutstanding*100, '1.1-1')}% : null; }
	get displayInventory():string{ return this.tick ? `${this.decimalPipe.transform(this.tick.shortableAvailable/1000, '1.0-0')}k` : null; }
	get displayVolume()
	{
		var display = null;
		if( this.tick )
		{
			if( this.volumeAverage )
				display = this.decimalPipe.transform( this.tick.volume*100*100*this.tick.volumeMultiplier/this.volumeAverage, '1.1-1' );
			else
			{
				var volume = this.tick.volume*100;
				let divisor = 1;  let fixedPlaces = 0; let suffix = "";
				let calc = ( amount:number, sffx:string ):boolean=>
				{
					if( volume>amount )
						divisor = amount;
					if( divisor!=1 )
					{
						fixedPlaces =  volume>amount*10 ? volume>amount*100 ? 0 : 1 : 2;
						suffix = sffx;
					}
					return divisor!=1;
				};

				calc( 1_000_000, "M" ) || calc( 1_000, "K" );
				volume/=divisor;
				display = (fixedPlaces==0 ? volume.toString() : (volume).toFixed(fixedPlaces))+suffix;
			}
		}
		return display;
	}

	editEvents:Subject<number>;//@Input()
	editItem:string;
	editEmitter = new EventEmitter<number>();//@Output()

	oddRow:boolean;
	rowId:number;
	get shares(){return this.#shares;} set shares(x){ this.#shares=x; } #shares:number;
	avgPrice:number;
	showMenu=false;

	get symbol():string|null{ return this.tick?.detail.contract.symbol; }
	@ViewChild("symbolInput") symbolInput: ElementRef;
	set tick( x )
	{
		this.#tick = x; /*console.log( `(${this.index})tick= ${x ? x.contract.symbol : 'null'}` );if( this.#tick ) this.subscribe(); else this.unsubscribe();*/
		let ref = this.row.get(0);
		let instance = ref["instance"];
		if( this.symbolCol )
			this.symbolCol.value = this.detail?.contract.symbol;
	} get tick(){ return this.#tick; } #tick:TickDetails;
	get selected(){ return this._selected;} set selected( x )
	{
		if( x )
			this.parent.selected = this;
		else if( this.parent.selected?.rowId == this.rowId )
			this.parent.selected = null;
		this._selected = x;
	} _selected:boolean;
	parent:WatchTableComponent;

	avgPriceCol:WatchCol;
	sharesCol:WatchCol;
	symbolCol:WatchCol;
	//viewPromise:Promise<boolean>=null;// = new Promise<void>( (resolve) => { this.resolve = resolve;} );
	volumeAverage:number;
	@ViewChild('row', {read: ViewContainerRef}) row: ViewContainerRef;
}