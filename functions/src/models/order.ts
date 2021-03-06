import { Database } from '../database/database';
import { Driver } from './order/partner';
import * as admin from 'firebase-admin';
import FieldValue = admin.firestore.FieldValue;

export interface OrderData {
  statementUID?: string;
  userUID?: string;
  total?: string;
  saving?: string;
  subTotal?: string;
  email?: string;
  articles?: any[];
  address?: string;
  coords?: any;
  thereIsAnArticleForSeniors?: boolean;
  photo?: string;
  time?: string;
  timer?: number;
  payment?: string;
  priority?: string;
  delivery?: string;
  status?: string;
  enterpriseUID?: string;
  comments?: string;
  driverPhotoURL?: string;
  userName?: string;
  driverName?: string;
  driverUID?: string;
  _geoloc?: any;
}

export class Order {
  private database = new Database();

  constructor(private body: OrderData, private userUID: string) {}

  async actionWithoutNotification() {
    const database = new Database();
    const user = await database.collection('users').showData(this.userUID);
    const userName = user.displayName;
    const body = {
      userUID: this.userUID,
      status: 'Listo',
      email: user.email,
      address: this.body.address || '',
      comments: this.body.comments || '',
      _geoloc: {
        lat: this.body._geoloc.lat,
        lng: this.body._geoloc.lng,
      },
      delivery: this.body.delivery,
      payment: this.body.payment,
      priority: this.body.priority,
      saving: this.body.saving,
      subTotal: this.body.subTotal || '$0',
      enterpriseUIDs: {
        [`${this.body.enterpriseUID}`]: true,
      },
      thereIsAnArticleForSeniors: this.body.thereIsAnArticleForSeniors || false,
      total: this.body.total,
      time: this.body.time,
      statementUID: this.body.statementUID,
      userName,
      driverName: this.body.driverName,
      driverPhotoURL: this.body.driverPhotoURL,
      driverUID: this.body.driverUID,
      driverVehicle: 'Compra en marca participante',
    };
    return this.database.collection('orders').storeAutogeneratedUID(body);
  }

  storeArticles(articles: any[], orderID: string) {
    articles.forEach((article) =>
      this.database.collection(`orders/${orderID}/articles`).storeWith(article.uid, {
        ...article,
      })
    );
  }

  async action() {
    const user = await this.database.collection('users').showData(this.userUID);
    const userName = user.displayName;
    const driver = new Driver();
    const _geoloc = {
      lat: this.body.coords.latitude,
      lng: this.body.coords.longitude,
    };
    const availaibleDriver = await driver.localizate(_geoloc);
    return this.database
      .collection('orders')
      .storeAutogeneratedUID({
        userUID: this.userUID,
        status: 'Preparando',
        address: this.body.address,
        comments: this.body.comments,
        _geoloc,
        email: user.email,
        delivery: this.body.delivery,
        payment: this.body.payment,
        priority: this.body.priority,
        saving: this.body.saving,
        subTotal: this.body.subTotal,
        enterpriseUIDs: this.body.articles
          .map((article) => article.enterpriseUID)
          .reduce((previousValue, currentValue) => {
            return Object.assign(previousValue, {
              [currentValue]: true,
            });
          }, {}),
        thereIsAnArticleForSeniors: this.body.thereIsAnArticleForSeniors || false,
        total: this.body.total,
        minutes: this.body.timer,
        time: `Compra principal en ${this.body.articles[0].enterpriseName}`,
        userName,
        ...availaibleDriver,
      })
      .then((response: { id: string }) =>
        this.body.articles.forEach((article) => {
          this.database.collection(`orders/${response.id}/articles`).storeWith(article.uid, article);
          this.database.collection('articles').update(article.uid, {
            totalUnitsSold: FieldValue.increment(article.amount),
            unitsInSite: FieldValue.increment(-article.amount),
          });
        })
      );
  }
}
