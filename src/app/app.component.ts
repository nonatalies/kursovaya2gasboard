import {AfterViewInit, Component, OnInit, ViewChild} from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import {MatSort} from "@angular/material/sort";
import {LegendPosition} from "@swimlane/ngx-charts";
import {MatPaginator} from "@angular/material/paginator";
import {countries} from "./app.model";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit {

  @ViewChild(MatSort) public sort: any = MatSort;
  @ViewChild(MatPaginator) public paginator: any = MatPaginator;

  constructor() {

  }
  public title = 'gas-board';

  public gasByCountry: any = {};

  public displayedColumns = ['country', 'production', 'consumption', 'reserves'];

  public dataSource = new MatTableDataSource<any>();

  public consumptionTop10 = [];
  public productionTop10 = [];
  public reservesTop10 = [];
  public view: [number, number] = [750, 410];

  public anotherView: [number, number] = [900, 380];
  public sourceType = 'production';
  public pieChartType = true;

  public loading = true;

  public years: any = [];
  public yearsFirstPage = [];
  public yearsSecondPage = [];

  public firstPage = false;

  public yearChosen = '';
  public yearFrom = '';
  public yearTo: string | null = '';

  public countryChosen: any = null;
  public multiContentByCountry = [];

  public totalWorldContent: any = {};

  public lastYearContent: any = [];

  public lastYearConsumption:any = [];
  public lastYearProduction:any = [];
  public lastYearReserves:any = [];

  get source() {
    switch(this.sourceType) {
      case 'production': {
        return this.productionTop10;
      }
      case 'consumption': {
        return this.consumptionTop10;
      }
      case 'reserves': {
        return this.reservesTop10;
      }
      default: {
        return null;
      }
    }
  }

  get pagedYears() {
    if (this.firstPage) {
      return this.yearsFirstPage;
    }
    return this.yearsSecondPage;
  }

  get countryInfo() {
    if (this.countryChosen) {
      let production: any = '-';
      let consumption: any = '-';
      let reserves: any = '-';
      if(this.countryChosen?.production){
        production = Math.round(this.countryChosen?.production[this.countryChosen.production?.length - 1]?.value);
      }
      if(this.countryChosen?.consumption) {
        consumption = Math.round(this.countryChosen?.consumption[this.countryChosen.consumption?.length - 1]?.value);
      }
      if(this.countryChosen?.reserves) {
        reserves = Math.round(this.countryChosen?.reserves[this.countryChosen.reserves?.length - 1]?.value);
      }
      const productionTotal = this.totalWorldContent?.production[this.totalWorldContent.production?.length - 1]?.value;
      const consumptionTotal = this.totalWorldContent?.consumption[this.totalWorldContent.consumption?.length - 1]?.value;
      const reservesTotal = this.totalWorldContent?.reserves[this.totalWorldContent.reserves?.length - 1]?.value;
      return {
        production: production,
        consumption: consumption,
        reserves: reserves,
        productionPer: production == '-' ? '-' : Math.round((production / productionTotal) * 100),
        consumptionPer: consumption == '-' ? '-' : Math.round((consumption / consumptionTotal) * 100),
        reservesPer: reserves == '-' ? '-' : Math.round((reserves / reservesTotal) * 100),
        productionRank: production == '-' ? '-' : this.lastYearProduction.indexOf(this.lastYearProduction.find((it: { country: any; }) => it.country === this.countryChosen.country)) + 1,
        consumptionRank: consumption == '-' ? '-' : this.lastYearConsumption.indexOf(this.lastYearConsumption.find((it: { country: any; }) => it.country === this.countryChosen.country)) + 1,
        reservesRank: reserves == '-' ? '-' : this.lastYearReserves.indexOf(this.lastYearReserves.find((it: { country: any; }) => it.country === this.countryChosen.country)) + 1
      };
    }
    return null;
  }

  updateAll() {
    this.updateTableForYear(this.yearChosen);
    this.getTop10();
  }
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  ngOnInit() {
    const urls = ['gas-production-by-country', 'gas-consumption-by-country', 'gas-reserves-by-country'];
    Promise.all(urls.map(url =>
      fetch(`http://localhost:4220/?page=${url}`)
        .then(resp => resp.json())
    )).then(jsons => {
      jsons.forEach(it =>{
        let resultByCountry = it.body.resultByCountry;
        switch(it.source) {
            case 'gas-production-by-country': {
              Object.entries(resultByCountry).forEach(entry => {
                const [key, value] = entry;
                this.gasByCountry[key] = {...this.gasByCountry[key], production: value};
              });
              break;
            }

            case 'gas-consumption-by-country': {
              this.years = it.body.years;
              this.yearsFirstPage = this.years.slice(0, 24);
              this.yearsSecondPage = this.years.slice(24, this.years.length);
              this.yearChosen = this.years[this.years.length - 1];
              this.resetYears();
              Object.entries(resultByCountry).forEach(entry => {
                const [key, value] = entry;
                this.gasByCountry[key] = {...this.gasByCountry[key], consumption: value};
              });
              break;
            }

            case 'gas-reserves-by-country': {
              Object.entries(resultByCountry).forEach(entry => {
                const [key, value] = entry;
                this.gasByCountry[key] = {...this.gasByCountry[key], reserves: value};
              });
              break;
            }

            default : {
              break;
            }
          }
        });
      this.totalWorldContent = this.gasByCountry['Total world'];
      delete this.gasByCountry['Total world'];
      Object.keys(this.gasByCountry).forEach(key => {
        this.gasByCountry[key] = {...this.gasByCountry[key], country: countries[key].country, icon: countries[key].flag};
      });
      this.updateLineDiagram('Russia');
      this.updateTableForYear(this.yearChosen, true);
      this.getTop10(true);

      this.loading = false;
    });

  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
    // @ts-ignore
    this.dataSource.paginator._intl.itemsPerPageLabel = "Элементов на странице: ";
    // @ts-ignore
    this.dataSource.paginator._intl.nextPageLabel = "Следующая страница";
    // @ts-ignore
    this.dataSource.paginator._intl.previousPageLabel  = "Предыдущая страница";
  }


  updateTableForYear(year: string, save?: boolean) {
    const arr: any[] = [];
    Object.entries(this.gasByCountry).forEach(entry => {
      const [key, value] = entry;
        // @ts-ignore
        let production = value.production ? value.production.find(it=> it.year == year).value : '-';
        if (production !== '-') {
          production = Math.round(production);
        }
        // @ts-ignore
        let consumption = value.consumption ? value.consumption.find(it=> it.year == year).value : '-';
        if (consumption !== '-') {
          consumption = Math.round(consumption);
        }
        // @ts-ignore
        let reserves = value.reserves ? value.reserves.find(it=> it.year == year).value : '-';
        if (reserves !== '-') {
          reserves = Math.round(reserves);
        }
        arr.push({
          id: key,
          // @ts-ignore
          country: value.country,
          production: production,
          consumption: consumption,
          reserves: reserves,
        });
    });

    this.dataSource.data = arr;
    if (save) {
      this.lastYearContent = arr;
    }
  }

  getTop10(save?: boolean) {
    // @ts-ignore
    this.consumptionTop10 = this.dataSource.data
      .sort((a, b) => b.consumption - a.consumption )
      .slice(0, 10)
      .map(it => ({name: it.country, value: it.consumption}));
    // @ts-ignore
    this.productionTop10 = this.dataSource.data
      .sort((a, b) => b.production - a.production )
      .slice(0, 10)
      .map(it => ({name: it.country, value: it.production}));
    // @ts-ignore
    this.reservesTop10 = this.dataSource.data
      .sort((a, b) => b.reserves - a.reserves )
      .slice(0, 10)
      .map(it => ({name: it.country, value: it.reserves}));

    if(save) {
      this.lastYearConsumption = [...this.dataSource.data
        .sort((a, b) => b.consumption - a.consumption )];
      this.lastYearProduction = [...this.dataSource.data
        .sort((a, b) => b.production - a.production )];
      this.lastYearReserves = [...this.dataSource.data
        .sort((a, b) => b.reserves - a.reserves )];
    }
  }

  updateLineDiagram(name?: string) {
    if(name) {
      this.countryChosen = this.gasByCountry[name];
    }
    let indexFrom = this.years.indexOf(this.yearFrom);
    let indexTo = this.years.indexOf(this.yearTo);
    if(!this.countryChosen.production && !this.countryChosen.consumption) {
      this.multiContentByCountry = [];
      return;
    }
    let prod = null;
    let cons = null;
    if(this.countryChosen.consumption) {
      // @ts-ignore
      cons = {name: "Спрос", series: this.countryChosen.consumption.map((it)=>({name: ''+it.year, value: it.value == '-' ? null : Math.round(it.value)})).slice(indexFrom, indexTo + 1).filter(it => it.value)};
    }
    if(this.countryChosen.production) {
      // @ts-ignore
      prod = {name: "Предложение", series: this.countryChosen.production.map((it)=>({name: ''+it.year, value: it.value == '-' ? null : Math.round(it.value)})).slice(indexFrom + 15, indexTo + 16).filter(it => it.value)};
    }
    if(prod && cons) {
      // @ts-ignore
      this.multiContentByCountry = [prod, cons];

      return;
    }
    if(prod) {
      // @ts-ignore
      this.multiContentByCountry = [prod];
      return;
    }

    // @ts-ignore
    this.multiContentByCountry = [cons];
  }

  resetYears() {
    this.yearFrom = this.years[0];
    this.yearTo = this.years[this.years.length - 1];
    if(this.countryChosen) {
      this.updateLineDiagram();
    }

  }

  changeYearToYearFrom(year: string) {
    if(this.yearTo == null) {
      this.yearTo = year;
      this.updateLineDiagram();
    } else {
      this.yearFrom = year;
      this.yearTo = null;
    }
  }
}
